import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Public — OAuth flow
router.get("/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleCallback);

// Public — refresh uses its own refresh_token cookie (no access_token needed)
router.post("/refresh", AuthController.refresh as any);

// Protected — require valid access_token
router.get("/me", authMiddleware as any, AuthController.me as any);
router.post("/logout", authMiddleware as any, AuthController.logout as any);

export default router;
