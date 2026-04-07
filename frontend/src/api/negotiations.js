import { apiRequest } from "./client";

export function createNegotiationApi(payload) {
  return apiRequest("/negotiations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyNegotiationsApi(queryString = "") {
  return apiRequest(`/negotiations/me${queryString}`);
}

export function updateMyNegotiationDecisionApi(payload) {
  return apiRequest("/negotiations/me/decision", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
