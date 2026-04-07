import { apiRequest } from "./client";

export function registerBusinessApi(payload) {
  return apiRequest("/businesses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBusinessesApi(queryString = "") {
  return apiRequest(`/businesses${queryString}`);
}

export function getBusinessByIdApi(id) {
  return apiRequest(`/businesses/${id}`);
}

export function getCurrentBusinessApi() {
  return apiRequest("/businesses/me");
}

export function updateBusinessApi(payload) {
  return apiRequest("/businesses/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadBusinessAvatarApi(formData) {
  return apiRequest("/businesses/me/avatar", {
    method: "PUT",
    body: formData,
  });
}

export function getBusinessJobsApi(queryString = "") {
  return apiRequest(`/businesses/me/jobs${queryString}`);
}

export function createBusinessJobApi(payload) {
  return apiRequest("/businesses/me/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBusinessJobApi(jobId, payload) {
  return apiRequest(`/businesses/me/jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteBusinessJobApi(jobId) {
  return apiRequest(`/businesses/me/jobs/${jobId}`, {
    method: "DELETE",
  });
}