"use client";

import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/api";
import { joinMeeting } from "@/lib/api";

function formatMeetingCode(code: string) {
  const digits = code.replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : code;
}

export default function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [copied, setCopied] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Format after mount so the browser's local timezone is used without a hydration mismatch.
  useEffect(() => {
    const date = new Date(meeting.start_time);
    setDateLabel(date.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }));
  }, [meeting.start_time]);

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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{meeting.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#edf3ff] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#0B5CFF]">{meeting.status}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Meeting ID</p>
          <p className="mt-1 text-sm font-medium tracking-wide text-slate-700">{formatMeetingCode(meeting.meeting_code)}</p>
        </div>
        <div className="flex items-center gap-1"><button type="button" onClick={copyInvite} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0B5CFF] hover:bg-[#f3f7ff]">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="7" y="7" width="9" height="10" rx="2" /><path d="M12 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>
          {copied ? "Copied" : "Copy invite"}
        </button>{meeting.status === "scheduled" && meeting.host_id === 1 && <button type="button" disabled={starting} onClick={startMeeting} className="rounded-lg bg-[#0B5CFF] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{starting ? "Starting…" : "Start"}</button>}</div>
      </div>
      {startError && <p role="alert" className="mt-2 text-xs text-red-600">{startError}</p>}
    </article>
  );
}
