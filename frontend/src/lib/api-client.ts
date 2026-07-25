import axios, { AxiosError } from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Create Axios instance pointing to the backend API base URL
export const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

// ── Silent token refresh interceptor ──────────────────────────────────────────
// Track whether a refresh is already in flight to avoid parallel refresh calls
let isRefreshing = false;
let pendingQueue: Array<{ resolve: () => void; reject: (err: any) => void }> = [];

function processQueue(error: any) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  // Pass successful responses straight through
  (response) => response,

  // On error, intercept 401s
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Only attempt refresh on 401, and only once per request (_retry flag)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh if this IS the refresh or logout call (avoid infinite loop)
      if (
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/logout")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the refresh endpoint — uses httpOnly refresh_token cookie automatically
        await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        return apiClient(originalRequest); // retry the original request
      } catch (refreshError) {
        processQueue(refreshError);
        // Just reject — AuthContext will set user=null and ProtectedRoute will
        // redirect to /login. Do NOT do window.location.href here (causes reload loop).
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Reusable typed fetch helper ───────────────────────────────────────────────
export async function apiFetch<T>(
  url: string,
  options?: {
    method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
    data?: any;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const method = options?.method || "GET";
  const response = await apiClient({
    url,
    method,
    data: options?.data,
    headers: options?.headers,
  });
  return response.data;
}

export default apiFetch;
