export function getConfigName(config) {
  return config.taskType || "AI configuration";
}

export function getEnvironment(config) {
  const value = String(config.taskType || "").toLowerCase();
  if (value.includes("prod")) return "production";
  if (value.includes("staging") || value.includes("stage")) return "staging";
  if (value.includes("dev") || value.includes("test")) return "development";
  return "default";
}

export function formatEnvironment(environment) {
  const labels = {
    production: "Production",
    staging: "Staging",
    development: "Development",
    default: "Default",
  };
  return labels[environment] || environment;
}

export function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Chưa cập nhật";
  }
}

export function truncatePrompt(prompt = "", maxLength = 130) {
  if (!prompt) return "Chưa có system prompt.";
  if (prompt.length <= maxLength) return prompt;
  return `${prompt.slice(0, maxLength).trim()}...`;
}
