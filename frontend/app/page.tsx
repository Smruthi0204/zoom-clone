"use client";

import { useEffect, useState } from "react";
import ActionTile from "@/components/ActionTile";
import MeetingCard from "@/components/MeetingCard";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { getRecent, getUpcoming, type Meeting } from "@/lib/api";

function TileIcon({ kind }: { kind: "video" | "join" | "calendar" }) {
  if (kind === "video") {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-3v10l-6-3" /></svg>;
  }
  if (kind === "join") {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
}

function MeetingSection({ title, meetings, loading, error }: { title: string; meetings: Meeting[]; loading: boolean; error: string }) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <a href="/meetings" className="text-sm font-semibold text-[#0B5CFF] hover:underline">View all</a>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">Loading meetings…</div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center text-sm text-amber-800">{error}</div>
      ) : meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">No meetings to show yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div>
      )}
    </section>
  );
}

export default function Home() {
  const [today, setToday] = useState("");
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [recentError, setRecentError] = useState("");

  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    // Load each list independently so one unavailable endpoint does not hide the other.
    getUpcoming().then(setUpcoming).catch(() => setUpcomingError("Upcoming meetings could not be loaded. Check that the backend is running.")).finally(() => setUpcomingLoading(false));
    getRecent().then(setRecent).catch(() => setRecentError("Recent meetings could not be loaded. Check that the backend is running.")).finally(() => setRecentLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      <div className="flex min-h-[calc(100vh-76px)]">
        <Sidebar />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500">{today}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">Good to see you, Alex <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 text-sm text-slate-500">Ready to connect with your team?</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ActionTile label="New Meeting" color="#FF742E" icon={<TileIcon kind="video" />} />
            <ActionTile label="Join Meeting" color="#0B5CFF" icon={<TileIcon kind="join" />} />
            <ActionTile label="Schedule Meeting" color="#0B5CFF" icon={<TileIcon kind="calendar" />} />
          </div>

          <MeetingSection title="Upcoming meetings" meetings={upcoming} loading={upcomingLoading} error={upcomingError} />
          <MeetingSection title="Recent meetings" meetings={recent} loading={recentLoading} error={recentError} />
        </main>
      </div>
    </div>
  );
}
