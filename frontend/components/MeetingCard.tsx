"use client";

import { useEffect, useState } from "react";
import { joinMeeting, type Meeting } from "@/lib/api";

function formatMeetingCode(code: string) {
  const digits = code.replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : code;
}

export default function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [copied, setCopied] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Format after mount so the browser's local timezone is used without a hydration mismatch.
  useEffect(() => {
    const start = new Date(meeting.start_time);
    const end = new Date(start.getTime() + meeting.duration_minutes * 60_000);
    const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
    setDateLabel(start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
    setTimeRange(`${start.toLocaleTimeString(undefined, options)} - ${end.toLocaleTimeString(undefined, options)}`);
  }, [meeting.start_time, meeting.duration_minutes]);

  async function copyInvite() {
    await navigator.clipboard.writeText(meeting.invite_link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function startMeeting() {
    setStarting(true);
    setStartError("");
    try {
      const host = await joinMeeting(meeting.meeting_code, "Alex Morgan", "host");
      sessionStorage.setItem(`meeting-participant:${meeting.meeting_code}`, String(host.id));
      sessionStorage.setItem(`meeting-role:${meeting.meeting_code}`, host.role);
      window.location.href = `/meeting/${meeting.meeting_code}?name=${encodeURIComponent(host.display_name)}`;
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Could not start meeting");
      setStarting(false);
    }
  }

  return (
    <article className="grid gap-3 px-4 py-4 transition hover:bg-zoom-panel md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center md:px-5">
      <div className="text-sm font-medium text-zoom-muted">
        <p>{timeRange}</p>
        <p className="mt-1 text-xs font-normal text-zoom-muted">{dateLabel}</p>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zoom-heading">{meeting.title}</h3>
        <p className="mt-1 text-xs text-zoom-muted">Meeting ID: {formatMeetingCode(meeting.meeting_code)}</p>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        {meeting.status === "scheduled" && meeting.host_id === 1 && <button type="button" disabled={starting} onClick={startMeeting} className="rounded-lg bg-zoom-blue px-4 py-2 text-xs font-semibold text-white transition hover:bg-zoom-blue-hover focus-visible:ring-2 focus-visible:ring-zoom-blue focus-visible:ring-offset-2 disabled:opacity-60">{starting ? "Starting…" : "Start"}</button>}
        <button type="button" onClick={copyInvite} aria-label="Copy invite link" title={copied ? "Copied" : "Copy invite link"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zoom-border text-zoom-muted transition hover:bg-white hover:text-zoom-blue focus-visible:ring-2 focus-visible:ring-zoom-blue">
          {copied ? <span className="text-xs font-semibold text-zoom-blue">✓</span> : <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="7" y="7" width="9" height="10" rx="2" /><path d="M12 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>}
        </button>
      </div>
      {startError && <p role="alert" className="text-xs text-zoom-red md:col-start-2">{startError}</p>}
    </article>
  );
}
