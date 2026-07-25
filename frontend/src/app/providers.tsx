"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { NotificationProvider } from "@/hooks/useNotifications";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <ProtectedRoute>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ProtectedRoute>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export default Providers;
