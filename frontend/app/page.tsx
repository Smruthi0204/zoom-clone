"use client";

import { useEffect, useState, type FormEvent } from "react";
import ActionTile from "@/components/ActionTile";
import MeetingCard from "@/components/MeetingCard";
import Modal from "@/components/Modal";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { createInstantMeeting, getMeeting, getParticipants, getRecent, getUpcoming, joinMeeting, scheduleMeeting, type Meeting } from "@/lib/api";

function TileIcon({ kind }: { kind: "video" | "join" | "calendar" }) {
  if (kind === "video") {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-3v10l-6-3" /></svg>;
  }
  if (kind === "join") {
    return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
}

function extractMeetingCode(input: string) {
  const value = input.trim();

  // Read invite IDs from the path so digits in localhost:3000 are ignored.
  if (/^https?:\/\//i.test(value)) {
    try {
      const pathPart = new URL(value).pathname.split("/").filter(Boolean).map(decodeURIComponent)
        .find((part) => part.replace(/\D/g, "").length === 10);
      return pathPart?.replace(/\D/g, "") ?? "";
    } catch {
      return "";
    }
  }

  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? digits : "";
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
  const [modal, setModal] = useState<"new" | "join" | "schedule" | null>(null);
  const [instantMeeting, setInstantMeeting] = useState<Meeting | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scheduledInvite, setScheduledInvite] = useState("");

  async function openNewMeeting() {
    setModal("new");
    setBusy(true);
    setActionError("");
    setInstantMeeting(null);
    try {
      setInstantMeeting(await createInstantMeeting());
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not create meeting");
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    setModal(null);
    setActionError("");
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = extractMeetingCode(joinCode);
    if (!code) {
      setActionError("Enter a valid 10 digit Meeting ID or invite link.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await getMeeting(code);
      const participant = await joinMeeting(code, displayName);
      sessionStorage.setItem(`meeting-participant:${code}`, String(participant.id));
      window.location.href = `/meeting/${code}?name=${encodeURIComponent(displayName)}`;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not join meeting");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const localStart = `${form.get("date")}T${form.get("time")}`;
    const start = new Date(localStart);
    if (start <= new Date()) {
      setActionError("Choose a date and time in the future.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const meeting = await scheduleMeeting({
        title: String(form.get("title")),
        description: String(form.get("description")),
        start_time: start.toISOString(),
        duration_minutes: Number(form.get("duration")),
      });
      setScheduledInvite(meeting.invite_link);
      setModal(null);
      try {
        setUpcoming(await getUpcoming());
        setUpcomingError("");
      } catch (error) {
        // The schedule succeeded even if refreshing the list failed.
        setUpcomingError(error instanceof Error ? error.message : "Could not refresh upcoming meetings");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not schedule meeting");
    } finally {
      setBusy(false);
    }
  }

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
            <ActionTile label="New Meeting" color="#FF742E" icon={<TileIcon kind="video" />} onClick={openNewMeeting} />
            <ActionTile label="Join Meeting" color="#0B5CFF" icon={<TileIcon kind="join" />} onClick={() => { setModal("join"); setActionError(""); }} />
            <ActionTile label="Schedule Meeting" color="#0B5CFF" icon={<TileIcon kind="calendar" />} onClick={() => { setModal("schedule"); setActionError(""); }} />
          </div>

          {scheduledInvite && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><span>Meeting scheduled: <a className="font-semibold underline" href={scheduledInvite}>{scheduledInvite}</a></span><button type="button" onClick={() => navigator.clipboard.writeText(scheduledInvite)} className="font-semibold">Copy link</button></div>}

          <MeetingSection title="Upcoming meetings" meetings={upcoming} loading={upcomingLoading} error={upcomingError} />
          <MeetingSection title="Recent meetings" meetings={recent} loading={recentLoading} error={recentError} />
        </main>
      </div>

      {modal === "new" && <Modal title="Your meeting is ready" onClose={closeModal}>
        {busy ? <p className="text-sm text-slate-500">Creating your meeting…</p> : actionError ? <p role="alert" className="text-sm text-red-600">{actionError}</p> : instantMeeting && <div>
          <p className="text-sm text-slate-500">Meeting ID</p><p className="mt-1 text-2xl font-bold tracking-wider">{instantMeeting.meeting_code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p>
          <p className="mt-5 text-sm font-medium text-slate-700">Invite link</p><div className="mt-2 flex gap-2"><input readOnly value={instantMeeting.invite_link} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"/><button type="button" onClick={() => navigator.clipboard.writeText(instantMeeting.invite_link)} className="rounded-lg border px-3 text-sm font-semibold text-[#0B5CFF]">Copy</button></div>
          <button type="button" onClick={async () => {
            setBusy(true);
            try {
              // Instant meetings already add their host as a participant.
              const participants = await getParticipants(instantMeeting.meeting_code);
              const participant = participants.find((person) => person.role === "host");
              if (!participant) throw new Error("Could not find the meeting host participant");
              sessionStorage.setItem(`meeting-participant:${instantMeeting.meeting_code}`, String(participant.id));
              window.location.href = `/meeting/${instantMeeting.meeting_code}?name=${encodeURIComponent("Alex Morgan")}`;
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Could not join meeting");
              setBusy(false);
            }
          }} className="mt-6 w-full rounded-xl bg-[#0B5CFF] px-4 py-3 font-semibold text-white">Start meeting</button>
        </div>}
      </Modal>}

      {modal === "join" && <Modal title="Join a meeting" onClose={closeModal}>
        <form onSubmit={handleJoin} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Meeting ID or invite link<input required value={joinCode} onChange={(event) => setJoinCode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="123 456 7890 or paste a link" /></label>
          <label className="block text-sm font-medium text-slate-700">Display name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Your name" /></label>
          {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#0B5CFF] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Joining…" : "Join meeting"}</button>
        </form>
      </Modal>}

      {modal === "schedule" && <Modal title="Schedule a meeting" onClose={closeModal}>
        <form onSubmit={handleSchedule} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Title<input name="title" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-slate-700">Description<textarea name="description" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" rows={2} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">Date<input name="date" type="date" required min={new Date().toLocaleDateString("en-CA")} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium text-slate-700">Time<input name="time" type="time" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label></div>
          <label className="block text-sm font-medium text-slate-700">Duration<select name="duration" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></label>
          {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#0B5CFF] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Schedule meeting"}</button>
        </form>
      </Modal>}
    </div>
  );
}
