"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Layers, Sparkles, BookOpen, Headphones, MessageSquare, Compass, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (err: string) => {
    switch (err) {
      case "no_code":
        return "Authorization code missing from Google.";
      case "token_exchange_failed":
        return "Failed to exchange authorization token with Google.";
      case "profile_fetch_failed":
        return "Failed to retrieve user profile information.";
      case "email_not_provided":
        return "Google did not provide an email address for your account.";
      default:
        return "An unexpected authentication error occurred. Please try again.";
    }
  };

  const handleGoogleLogin = () => {
    // Redirect directly to backend Google Auth initiation route
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <main className="h-screen w-screen flex flex-col md:flex-row bg-background text-foreground font-sans overflow-hidden transition-colors duration-250">
      {/* Left side: Premium Branding & Feature Overview */}
      <div className="flex-1 hidden md:flex flex-col justify-between p-12 bg-linear-to-br from-stone-50 via-white to-stone-100 dark:from-[#111110] dark:via-[#141413] dark:to-[#1a1a19] border-r border-border relative overflow-hidden">
        {/* Subtle decorative grid/glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Branding */}
        <div className="flex items-center space-x-2.5 z-10">
          <div className="bg-foreground text-background p-2 rounded-lg shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight leading-none">
              NoteBook<span className="text-accent font-bold">LM</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">
              AI Cognitive Workspace
            </p>
          </div>
        </div>

        {/* Dynamic feature presentation */}
        <div className="space-y-8 max-w-lg z-10">
          <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent font-bold tracking-widest text-[10px] uppercase px-3.5 py-1.5 rounded-full border border-accent/25">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Workspace 2.0 Released
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-tight text-foreground">
            Your personalized, source-grounded AI collaborator.
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
            Upload PDFs, transcripts, audio, and web URLs to auto-generate structured roadmaps, interactive mindmaps, synthetic podcasts, and hold Q&A sessions backed by your customized knowledge base.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl border border-border bg-white/40 dark:bg-stone-900/40 backdrop-blur-xs flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Interactive Chat</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Query multiple sources simultaneously with precise citations.</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-white/40 dark:bg-stone-900/40 backdrop-blur-xs flex items-start gap-3">
              <Compass className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">Syllabus Guide</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Generate conceptual roadmaps and interactive node diagrams.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-muted-foreground font-semibold z-10">
          © 2026 NoteBookLM Studio. Secured by industry-standard Google OAuth.
        </div>
      </div>

      {/* Right side: Authentication Card */}
      <div className="w-full md:w-[480px] flex flex-col justify-center px-8 md:px-12 bg-white dark:bg-[#141413] transition-colors duration-250">
        <div className="max-w-sm w-full mx-auto space-y-8">
          {/* Logo representation on mobile */}
          <div className="flex md:hidden items-center space-x-2.5 mb-8">
            <div className="bg-foreground text-background p-1.5 rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground tracking-tight">
                NoteBook<span className="text-accent font-bold">LM</span>
              </h1>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-muted-foreground font-semibold">
              Sign in to access your research notebooks and workspace resources.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="text-[11px] opacity-90 mt-0.5">{getErrorMessage(error)}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 text-xs font-bold rounded-[22px] shadow-sm cursor-pointer flex items-center justify-center gap-2 border border-transparent transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </Button>
          </div>

          <div className="text-center text-[10px] text-muted-foreground font-semibold pt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
          Loading login interface...
        </p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

// Inline Loader2 fallback reference to avoid compilation errors
function Loader2({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
