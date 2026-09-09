// Single source of truth for talking to the ESPect backend.
// The rest of the app never touches fetch()/URLs directly - it
// only calls the functions exported from here.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, { status = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function readErrorDetail(response, fallback) {
  try {
    const data = await response.json();
    if (data && typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Response wasn't JSON (e.g. an HTML error page) - fall through.
  }
  return fallback;
}

// Wraps fetch() so a CORS block / backend-not-running / DNS failure
// (all indistinguishable from JS) surfaces as one clear, actionable
// message instead of a raw "Failed to fetch" TypeError.
async function request(path, options) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(
      `Could not reach the ESPect backend at ${API_BASE_URL}. ` +
        "Make sure the backend is running, and that it allows " +
        "requests from this origin (CORS).",
      { isNetworkError: true }
    );
  }

  return response;
}

export async function checkHealth() {
  const response = await request("/health", { method: "GET" });

  if (!response.ok) {
    throw new ApiError("Backend health check failed.", {
      status: response.status,
    });
  }

  return response.json();
}

export async function analyzePcap(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await request("/api/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, "PCAP analysis failed.");
    throw new ApiError(detail, { status: response.status });
  }

  return response.json();
}

export async function generateReport(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await request("/api/report", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(
      response,
      "Report generation failed."
    );
    throw new ApiError(detail, { status: response.status });
  }

  const blob = await response.blob();

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "ESPect_Report.pdf";

  return { blob, filename };
}

export { ApiError };
