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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getMeetings(path: string): Promise<Meeting[]> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error("Could not load meetings");
  }

  return response.json();
}

export function getUpcoming() {
  return getMeetings("/meetings/upcoming");
}

export function getRecent() {
  return getMeetings("/meetings/recent");
}
