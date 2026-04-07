import { apiRequest } from "./client";

export function registerUserApi(payload) {
  return apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUserApi() {
  return apiRequest("/users/me");
}

export function updateUserApi(payload) {
  return apiRequest("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateAvailabilityApi(payload) {
  return apiRequest("/users/me/available", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadUserAvatarApi(formData) {
  return apiRequest("/users/me/avatar", {
    method: "PUT",
    body: formData,
  });
}

export function uploadUserResumeApi(formData) {
  return apiRequest("/users/me/resume", {
    method: "PUT",
    body: formData,
  });
}

export function getInvitationsApi(queryString = "") {
  return apiRequest(`/users/me/invitations${queryString}`);
}

export function getUserInterestsApi(queryString = "") {
  return apiRequest(`/users/me/interests${queryString}`);
}

export function getQualificationsApi(queryString = "") {
  return apiRequest(`/users/me/qualifications${queryString}`);
}

export function getUserJobsApi(queryString = "") {
  return apiRequest(`/users/me/jobs${queryString}`);
}