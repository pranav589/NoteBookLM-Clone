"use client";

import React, { useEffect } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!initialized) return; // wait for the first /auth/me to complete

    if (!isPublic && !user) {
      // Not logged in, trying to access a protected route → send to login
      router.replace("/login");
    } else if (isPublic && user) {
      // Already logged in, trying to access /login → send to dashboard
      router.replace("/");
    }
  }, [initialized, user, isPublic, router]);

  // While auth check is pending, show a spinner so we don't flash content
  if (!initialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
          Verifying session...
        </p>
      </div>
    );
  }

  // Block render until redirect completes
  if (!isPublic && !user) return null;
  if (isPublic && user) return null;

  return <>{children}</>;
}

export default ProtectedRoute;
