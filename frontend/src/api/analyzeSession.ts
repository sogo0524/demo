import type { DemoSession, StartSessionPayload } from "../types/session";
import { normalizeRealSession } from "../utils/normalizeSession";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const API_BASE_URL = configuredApiBaseUrl || "http://127.0.0.1:8000";

export async function analyzeSession(
  payload: StartSessionPayload,
): Promise<DemoSession> {
  if (!payload.videoFile?.file) {
    throw new Error("Upload a video file before starting analysis.");
  }

  const formData = new FormData();
  formData.append(
    "driving_duration_min",
    String(payload.manualInputs.driving_duration_min),
  );
  formData.append(
    "time_since_last_break_min",
    String(payload.manualInputs.time_since_last_break_min),
  );
  formData.append("video", payload.videoFile.file, payload.videoFile.name);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    body: formData,
    method: "POST",
  });
  const responseJson = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(responseJson, response.status));
  }

  return normalizeRealSession(responseJson, {
    label: `Analysis: ${responseJson.session_id ?? payload.videoFile.name}`,
    sourceFile: `${API_BASE_URL}/analyze`,
  });
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getErrorMessage(responseJson: unknown, status: number) {
  if (responseJson && typeof responseJson === "object") {
    if ("error" in responseJson && typeof responseJson.error === "string") {
      return responseJson.error;
    }

    if ("detail" in responseJson && typeof responseJson.detail === "string") {
      return responseJson.detail;
    }
  }

  return `Analysis failed with status ${status}.`;
}
