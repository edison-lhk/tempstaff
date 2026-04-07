import { apiRequest } from "./client";

export function getJobsApi(queryString = "") {
  return apiRequest(`/jobs${queryString}`);
}

export function getJobByIdApi(jobId) {
  return apiRequest(`/jobs/${jobId}`);
}

export function setJobInterestApi(jobId, payload) {
  return apiRequest(`/jobs/${jobId}/interested`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getJobCandidatesApi(jobId, queryString = "") {
  return apiRequest(`/jobs/${jobId}/candidates${queryString}`);
}

export function getCandidateByIdApi(jobId, userId) {
  return apiRequest(`/jobs/${jobId}/candidates/${userId}`);
}

export function setCandidateInterestApi(jobId, userId, payload) {
  return apiRequest(`/jobs/${jobId}/candidates/${userId}/interested`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getJobInterestsApi(jobId, queryString = "") {
  return apiRequest(`/jobs/${jobId}/interests${queryString}`);
}

export function markNoShowApi(jobId, payload = {}) {
  return apiRequest(`/jobs/${jobId}/no-show`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}