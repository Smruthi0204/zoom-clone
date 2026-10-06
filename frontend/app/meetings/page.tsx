"use client";

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

  useEffect(() => {
    Promise.all([getUpcoming(), getRecent()]).then(([next, past]) => {
      setUpcoming(next);
      setPrevious(past);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load meetings")).finally(() => setLoading(false));
  }, []);

  const meetings = tab === "upcoming" ? upcoming : previous;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      <div className="flex min-h-[calc(100vh-76px)]">
        <Sidebar current="Meetings" />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meetings</h1>
          <div className="mt-7 flex gap-6 border-b border-slate-200">
            {(["upcoming", "previous"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-1 pb-3 text-sm font-semibold capitalize ${tab === item ? "border-[#0B5CFF] text-[#0B5CFF]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{item}</button>)}
          </div>
          {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading meetings…</p> : error ? <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-800">{error}</p> : meetings.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">No {tab} meetings.</p>}
        </main>
      </div>
    </div>
  );
}
