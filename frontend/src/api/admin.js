import { apiRequest } from "./client";

// Users
export function getUsersApi(queryString = "") {
  return apiRequest(`/users${queryString}`);
}

export function setUserSuspendedApi(userId, payload) {
  return apiRequest(`/users/${userId}/suspended`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Businesses
export function getBusinessesAdminApi(queryString = "") {
  return apiRequest(`/businesses${queryString}`);
}

export function setBusinessVerifiedApi(businessId, payload) {
  return apiRequest(`/businesses/${businessId}/verified`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Position Types
export function getAdminPositionTypesApi(queryString = "") {
  return apiRequest(`/position-types${queryString}`);
}

export function createAdminPositionTypeApi(payload) {
  return apiRequest("/position-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminPositionTypeApi(positionTypeId, payload) {
  return apiRequest(`/position-types/${positionTypeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPositionTypeApi(positionTypeId) {
  return apiRequest(`/position-types/${positionTypeId}`, {
    method: "DELETE",
  });
}

// Qualifications
export function getAdminQualificationsApi(queryString = "") {
  return apiRequest(`/qualifications${queryString}`);
}

export function updateAdminQualificationApi(qualificationId, payload) {
  return apiRequest(`/qualifications/${qualificationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// System config
export function updateResetCooldownApi(payload) {
  return apiRequest("/system/reset-cooldown", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateNegotiationWindowApi(payload) {
  return apiRequest("/system/negotiation-window", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateJobStartWindowApi(payload) {
  return apiRequest("/system/job-start-window", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAvailabilityTimeoutApi(payload) {
  return apiRequest("/system/availability-timeout", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}