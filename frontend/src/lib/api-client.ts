import axios from "axios";

// Create Axios instance pointing to the backend API base URL
export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"}/api`,
});

// Reusable typed fetch function wrapping Axios
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
