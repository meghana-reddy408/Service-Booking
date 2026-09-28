export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    const error = new Error("Unable to connect to the server. Check that the backend is running.");
    error.status = 0;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      response.status === 409
        ? "That time slot is already booked. Please choose another time."
        : data?.message || "The request could not be completed. Please try again."
    );
    error.status = response.status;
    throw error;
  }

  return data;
}