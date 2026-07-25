import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_jwt_secret_key_123456";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "fallback_refresh_secret_key_7890";

// ── Token durations ────────────────────────────────────────────
const ACCESS_TOKEN_TTL_S  = 60 * 60;          // 1 hour in seconds
const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days in seconds
const ACCESS_TOKEN_COOKIE_MS  = ACCESS_TOKEN_TTL_S * 1000;
const REFRESH_TOKEN_COOKIE_MS = REFRESH_TOKEN_TTL_S * 1000;

// ── Cookie helper ──────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_COOKIE_MS,
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_COOKIE_MS,
    path: "/api/auth", // restrict refresh cookie to auth routes only
  });
}

function clearTokenCookies(res: Response) {
  res.clearCookie("access_token", { httpOnly: true, secure: isProduction, sameSite: "lax" });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
  });
}

// ── Token generation ───────────────────────────────────────────
function generateAccessToken(payload: { id: string; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_S });
}

function generateRefreshToken(payload: { id: string }) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL_S });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── Controller ─────────────────────────────────────────────────
export const AuthController = {
  googleLogin: (req: Request, res: Response) => {
    if (!GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: "Google OAuth credentials not configured on backend." });
      return;
    }

    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: GOOGLE_REDIRECT_URI,
      client_id: GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options).toString();
    res.redirect(`${rootUrl}?${qs}`);
  },

  googleCallback: async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
      res.redirect(`${FRONTEND_URL}/login?error=no_code`);
      return;
    }

    try {
      // Exchange authorization code for Google access token
      const tokenUrl = "https://oauth2.googleapis.com/token";
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
        return;
      }

      const { access_token } = await tokenResponse.json() as { access_token: string };

      // Fetch user profile from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!userInfoResponse.ok) {
        console.error("Failed to fetch Google user info");
        res.redirect(`${FRONTEND_URL}/login?error=profile_fetch_failed`);
        return;
      }

      const googleUser = await userInfoResponse.json() as {
        email: string;
        name: string;
        picture?: string;
      };

      if (!googleUser.email) {
        res.redirect(`${FRONTEND_URL}/login?error=email_not_provided`);
        return;
      }

      // Upsert user in MongoDB
      let user = await User.findOne({ email: googleUser.email.toLowerCase() });
      if (!user) {
        user = await User.create({
          email: googleUser.email.toLowerCase(),
          name: googleUser.name,
          avatarUrl: googleUser.picture,
        });
      } else {
        user.name = googleUser.name;
        if (googleUser.picture) user.avatarUrl = googleUser.picture;
      }

      // Issue access token (1h) + refresh token (7d)
      const userId = (user._id as any).toString();
      const accessToken  = generateAccessToken({ id: userId, email: user.email, name: user.name });
      const refreshToken = generateRefreshToken({ id: userId });

      // Hash and store refresh token for revocation
      user.refreshToken = hashToken(refreshToken);
      await user.save();

      setTokenCookies(res, accessToken, refreshToken);
      res.redirect(FRONTEND_URL);
    } catch (err) {
      console.error("Google auth callback error:", err);
      res.redirect(`${FRONTEND_URL}/login?error=unknown_error`);
    }
  },

  refresh: async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token;

    if (!token) {
      res.status(401).json({ error: "No refresh token provided." });
      return;
    }

    try {
      const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== hashToken(token)) {
        // Token has been revoked or user not found
        clearTokenCookies(res);
        res.status(401).json({ error: "Refresh token revoked or invalid." });
        return;
      }

      // Issue new access token + rotate refresh token
      const userId = (user._id as any).toString();
      const newAccessToken  = generateAccessToken({ id: userId, email: user.email, name: user.name });
      const newRefreshToken = generateRefreshToken({ id: userId });

      user.refreshToken = hashToken(newRefreshToken);
      await user.save();

      setTokenCookies(res, newAccessToken, newRefreshToken);
      res.json({ success: true });
    } catch (err) {
      clearTokenCookies(res);
      res.status(401).json({ error: "Invalid or expired refresh token." });
    }
  },

  me: async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const user = await User.findById(req.user.id).select("-refreshToken");
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Database error" });
    }
  },

  logout: async (req: AuthRequest, res: Response) => {
    // Revoke refresh token in DB so it can't be reused
    if (req.user?.id) {
      try {
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
      } catch (err) {
        console.error("Failed to clear refresh token on logout:", err);
      }
    }
    clearTokenCookies(res);
    res.json({ success: true });
  },
};
