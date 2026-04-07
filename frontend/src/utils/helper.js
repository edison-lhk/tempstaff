import { BACKEND_URL } from "../api/client";

export function toAssetUrl(path) {
  if (!path) return "";
  return `${BACKEND_URL}${path}`;
}

export function getFileNameFromPath(path) {
  if (!path) return "";
  try {
    return decodeURIComponent(path.split("/").pop() || path);
  } catch {
    return path.split("/").pop() || path;
  }
}