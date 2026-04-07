import { apiRequest } from "./client";

export function loginApi(payload) {
  return apiRequest("/auth/tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestResetApi(payload) {
  return apiRequest("/auth/resets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function completeResetApi(resetToken, payload) {
  return apiRequest(`/auth/resets/${resetToken}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerUserApi(payload) {
  return apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerBusinessApi(payload) {
  return apiRequest("/businesses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}