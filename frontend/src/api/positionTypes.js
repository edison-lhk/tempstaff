import { apiRequest } from "./client";

export function getPositionTypesApi(queryString = "") {
  return apiRequest(`/position-types${queryString}`);
}

export function createPositionTypeApi(payload) {
  return apiRequest("/position-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePositionTypeApi(positionTypeId, payload) {
  return apiRequest(`/position-types/${positionTypeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePositionTypeApi(positionTypeId) {
  return apiRequest(`/position-types/${positionTypeId}`, {
    method: "DELETE",
  });
}