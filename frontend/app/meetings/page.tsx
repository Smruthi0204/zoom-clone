"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MeetingCard from "@/components/MeetingCard";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { getRecent, getUpcoming, type Meeting } from "@/lib/api";

export default function MeetingsPage() {
  const [tab, setTab] = useState<"upcoming" | "previous">("upcoming");
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [previous, setPrevious] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meetingSearch, setMeetingSearch] = useState("");

  useEffect(() => {
    function handleSearch(event: Event) {
      setMeetingSearch((event as CustomEvent<string>).detail ?? "");
    }
    window.addEventListener("meeting-search", handleSearch);
    Promise.all([getUpcoming(), getRecent()]).then(([next, past]) => {
      setUpcoming(next);
      setPrevious(past);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load meetings")).finally(() => setLoading(false));
    return () => window.removeEventListener("meeting-search", handleSearch);
  }, []);

  const allMeetings = tab === "upcoming" ? upcoming : previous;
  const query = meetingSearch.trim().toLowerCase();
  const codeQuery = query.replace(/\s/g, "");
  const meetings = query ? allMeetings.filter((meeting) => meeting.title.toLowerCase().includes(query) || meeting.meeting_code.includes(codeQuery)) : allMeetings;
  const groups = meetings.reduce<Record<string, Meeting[]>>((result, meeting) => {
    const day = new Date(meeting.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    (result[day] ??= []).push(meeting);
    return result;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex min-h-[calc(100vh-56px)]">
        <Sidebar current="Meetings" />
        <main className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight text-zoom-heading">Meetings</h1><Link href="/" className="rounded-lg bg-zoom-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zoom-blue-hover">Schedule a meeting</Link></div>
          <div className="mt-6 flex gap-7 border-b border-zoom-border">
            {(["upcoming", "previous"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-1 pb-3 text-sm font-semibold capitalize transition ${tab === item ? "border-zoom-blue text-zoom-blue" : "border-transparent text-zoom-muted hover:text-zoom-heading"}`}>{item === "previous" ? "Previous" : "Upcoming"}</button>)}
          </div>
          {loading ? <p className="py-10 text-center text-sm text-zoom-muted">Loading meetings…</p> : error ? <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-5 text-sm text-amber-800">{error}</p> : meetings.length ? <div className="mt-6 space-y-7">{Object.entries(groups).map(([day, dayMeetings]) => <section key={day}><h2 className="mb-2 text-sm font-semibold text-zoom-heading">{day}</h2><div className="divide-y divide-zoom-border border-y border-zoom-border">{dayMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div></section>)}</div> : <p className="mt-6 border-y border-zoom-border bg-zoom-panel px-5 py-10 text-center text-sm text-zoom-muted">{query ? "No meetings match your search." : `No ${tab} meetings.`}</p>}
        </main>
      </div>
    </div>
  );
}
