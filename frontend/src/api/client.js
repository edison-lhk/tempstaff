export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.error || data.message || "Request failed"
        : data || "Request failed";

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}