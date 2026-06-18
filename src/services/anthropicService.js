import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export function sendAnthropicMessage({ apiKey, body }) {
  return apiRequest(ENDPOINTS.EXTERNAL.ANTHROPIC_MESSAGES, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  });
}
