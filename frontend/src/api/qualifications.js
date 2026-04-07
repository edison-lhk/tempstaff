import { apiRequest } from "./client";

export function getQualificationsApi(queryString = "") {
  return apiRequest(`/qualifications${queryString}`);
}

export function createQualificationApi(payload) {
  return apiRequest("/qualifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getQualificationByIdApi(qualificationId) {
  return apiRequest(`/qualifications/${qualificationId}`);
}

export function updateQualificationApi(qualificationId, payload) {
  return apiRequest(`/qualifications/${qualificationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadQualificationDocumentApi(qualificationId, formData) {
  return apiRequest(`/qualifications/${qualificationId}/document`, {
    method: "PUT",
    body: formData,
  });
}