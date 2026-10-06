export type Meeting = {
  id: number | string;
  meeting_code: string;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  invite_link: string;
};

type MeetingInput = {
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Keep the backend's message so users can understand validation failures.
    const message = data.detail ?? data.message ?? data.error;
    throw new ApiError(typeof message === "string" ? message : `Request failed with status ${response.status}`, response.status);
  }

  return data as T;
}

async function getMeetings(path: string) {
  return request<Meeting[]>(path);
}

export function getUpcoming() {
  return getMeetings("/meetings/upcoming");
}

export function getRecent() {
  return getMeetings("/meetings/recent");
}

export function createInstantMeeting() {
  return request<Meeting>("/meetings/instant", { method: "POST" });
}

export function scheduleMeeting(meeting: MeetingInput) {
  return request<Meeting>("/meetings/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meeting),
  });
}

export function getMeeting(code: string) {
  return request<Meeting>(`/meetings/${encodeURIComponent(code)}`).catch((error: unknown) => {
    // Only an HTTP 404 means the server could not find this meeting.
    if (error instanceof ApiError && error.status === 404 && error.message === "Request failed with status 404") {
      throw new Error("Meeting not found");
    }
    throw error;
  });
}

export function joinMeeting(code: string, display_name: string) {
  return request<Meeting>(`/meetings/${encodeURIComponent(code)}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name }),
  });
}
