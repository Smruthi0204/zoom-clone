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
    return <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
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

function MeetingSection({ title, meetings, loading, error, searchActive }: { title: string; meetings: Meeting[]; loading: boolean; error: string; searchActive: boolean }) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zoom-heading">{title}</h2>
        <a href="/meetings" className="text-sm font-semibold text-zoom-blue hover:underline">View all</a>
      </div>
      {loading ? (
        <div className="border-y border-zoom-border bg-white px-5 py-8 text-center text-sm text-zoom-muted">Loading meetings…</div>
      ) : error ? (
        <div className="border-y border-amber-200 bg-amber-50 px-5 py-6 text-center text-sm text-amber-800">{error}</div>
      ) : meetings.length === 0 ? (
        <div className="border-y border-zoom-border bg-white px-5 py-8 text-center text-sm text-zoom-muted">{searchActive ? "No meetings match your search." : `No ${title.toLowerCase()} meetings`}</div>
      ) : (
        <div className="divide-y divide-zoom-border border-y border-zoom-border bg-white">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div>
      )}
    </section>
  );
}

export default function Home() {
  const [today, setToday] = useState("");
  const [clock, setClock] = useState("");
  const [meetingSearch, setMeetingSearch] = useState("");
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
  const [scheduledMeetingId, setScheduledMeetingId] = useState("");
  const [roomMessage, setRoomMessage] = useState("");

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
      sessionStorage.setItem(`meeting-role:${code}`, participant.role);
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
      setScheduledMeetingId(meeting.meeting_code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"));
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
    function handleSearch(event: Event) {
      setMeetingSearch((event as CustomEvent<string>).detail ?? "");
    }
    window.addEventListener("meeting-search", handleSearch);
    const message = sessionStorage.getItem("dashboard-message");
    if (message) {
      setRoomMessage(message);
      sessionStorage.removeItem("dashboard-message");
    }
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    const updateClock = () => setClock(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    updateClock();
    const clockTimer = window.setInterval(updateClock, 30000);
    // Load each list independently so one unavailable endpoint does not hide the other.
    getUpcoming().then(setUpcoming).catch(() => setUpcomingError("Upcoming meetings could not be loaded. Check that the backend is running.")).finally(() => setUpcomingLoading(false));
    getRecent().then(setRecent).catch(() => setRecentError("Recent meetings could not be loaded. Check that the backend is running.")).finally(() => setRecentLoading(false));
    return () => {
      window.clearInterval(clockTimer);
      window.removeEventListener("meeting-search", handleSearch);
    };
  }, []);

  function filterMeetings(meetings: Meeting[]) {
    const titleQuery = meetingSearch.trim().toLowerCase();
    const codeQuery = titleQuery.replace(/\s/g, "");
    if (!titleQuery) return meetings;
    return meetings.filter((meeting) => meeting.title.toLowerCase().includes(titleQuery) || meeting.meeting_code.includes(codeQuery));
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex min-h-[calc(100vh-56px)]">
        <Sidebar />
        <main className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div><h1 className="text-2xl font-semibold tracking-tight text-zoom-heading">Good to see you, Alex <span aria-hidden="true">👋</span></h1>
              <p className="mt-2 text-sm text-zoom-muted">Ready to connect with your team?</p></div>
            <div className="min-w-[200px] rounded-xl border border-zoom-border bg-zoom-panel px-5 py-4 text-right">
              <p className="text-3xl font-semibold tracking-tight text-zoom-heading">{clock}</p><p className="mt-1 text-xs text-zoom-muted">{today}</p>
            </div>
          </div>

          {roomMessage && <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{roomMessage}</p>}

          <div className="mb-10 flex flex-wrap gap-x-8 gap-y-5">
            <ActionTile label="New meeting" color="var(--zoom-orange)" icon={<TileIcon kind="video" />} onClick={openNewMeeting} />
            <ActionTile label="Join" color="var(--zoom-blue)" icon={<TileIcon kind="join" />} onClick={() => { setModal("join"); setActionError(""); }} />
            <ActionTile label="Schedule" color="var(--zoom-blue)" icon={<TileIcon kind="calendar" />} onClick={() => { setModal("schedule"); setActionError(""); }} />
          </div>

          {scheduledInvite && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><span>Meeting scheduled · ID {scheduledMeetingId}: <a className="font-semibold underline" href={scheduledInvite}>{scheduledInvite}</a></span><button type="button" onClick={() => navigator.clipboard.writeText(scheduledInvite)} className="font-semibold">Copy link</button></div>}

          <MeetingSection title="Upcoming meetings" meetings={filterMeetings(upcoming)} loading={upcomingLoading} error={upcomingError} searchActive={Boolean(meetingSearch.trim())} />
          <MeetingSection title="Recent meetings" meetings={filterMeetings(recent)} loading={recentLoading} error={recentError} searchActive={Boolean(meetingSearch.trim())} />
        </main>
      </div>

      {modal === "new" && <Modal title="Your meeting is ready" onClose={closeModal}>
        {busy ? <p className="text-sm text-zoom-muted">Creating your meeting…</p> : actionError ? <p role="alert" className="text-sm text-zoom-red">{actionError}</p> : instantMeeting && <div>
          <p className="text-sm text-zoom-muted">Meeting ID</p><p className="mt-1 text-2xl font-semibold tracking-wider text-zoom-heading">{instantMeeting.meeting_code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p>
          <p className="mt-5 text-sm font-medium text-zoom-heading">Invite link</p><div className="mt-2 flex gap-2"><input readOnly value={instantMeeting.invite_link} className="min-w-0 flex-1 rounded-lg border border-zoom-border px-3 py-2 text-sm"/><button type="button" onClick={() => navigator.clipboard.writeText(instantMeeting.invite_link)} className="rounded-lg border border-zoom-border px-3 text-sm font-semibold text-zoom-blue">Copy</button></div>
          <button type="button" onClick={async () => {
            setBusy(true);
            try {
              // Instant meetings already add their host as a participant.
              const participants = await getParticipants(instantMeeting.meeting_code);
              const participant = participants.find((person) => person.role === "host");
              if (!participant) throw new Error("Could not find the meeting host participant");
              sessionStorage.setItem(`meeting-participant:${instantMeeting.meeting_code}`, String(participant.id));
              sessionStorage.setItem(`meeting-role:${instantMeeting.meeting_code}`, participant.role);
              window.location.href = `/meeting/${instantMeeting.meeting_code}?name=${encodeURIComponent("Alex Morgan")}`;
            } catch (error) {
              setActionError(error instanceof Error ? error.message : "Could not join meeting");
              setBusy(false);
            }
          }} className="mt-6 w-full rounded-lg bg-zoom-blue px-4 py-3 font-semibold text-white transition hover:bg-zoom-blue-hover">Start meeting</button>
        </div>}
      </Modal>}

      {modal === "join" && <Modal title="Join a meeting" onClose={closeModal}>
        <form onSubmit={handleJoin} className="space-y-4">
          <label className="block text-sm font-medium text-zoom-heading">Meeting ID or personal link name<input required value={joinCode} onChange={(event) => setJoinCode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-zoom-border px-3 py-2.5 focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" placeholder="123 456 7890 or paste a link" /></label>
          <label className="block text-sm font-medium text-zoom-heading">Your name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-zoom-border px-3 py-2.5 focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" placeholder="Your name" /></label>
          {actionError && <p role="alert" className="text-sm text-zoom-red">{actionError}</p>}
          <div className="flex gap-2"><button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-zoom-border px-4 py-3 font-semibold text-zoom-heading hover:bg-zoom-panel">Cancel</button><button disabled={busy} className="flex-1 rounded-lg bg-zoom-blue px-4 py-3 font-semibold text-white transition hover:bg-zoom-blue-hover disabled:opacity-60">{busy ? "Joining…" : "Join"}</button></div>
        </form>
      </Modal>}

      {modal === "schedule" && <Modal title="Schedule meeting" onClose={closeModal}>
        <form onSubmit={handleSchedule} className="space-y-4">
          <label className="grid grid-cols-[92px_1fr] items-center gap-3 text-sm font-medium text-zoom-heading">Topic<input name="title" required className="min-w-0 rounded-lg border border-zoom-border px-3 py-2.5 text-sm font-normal focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" /></label>
          <label className="grid grid-cols-[92px_1fr] items-start gap-3 text-sm font-medium text-zoom-heading">Description<textarea name="description" className="min-w-0 rounded-lg border border-zoom-border px-3 py-2.5 text-sm font-normal focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" rows={2} /></label>
          <div className="grid grid-cols-[92px_1fr] items-center gap-3"><span className="text-sm font-medium text-zoom-heading">When</span><div className="grid grid-cols-2 gap-2"><input aria-label="Date" name="date" type="date" required min={new Date().toLocaleDateString("en-CA")} className="min-w-0 rounded-lg border border-zoom-border px-2 py-2.5 text-sm focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" /><input aria-label="Time" name="time" type="time" required className="min-w-0 rounded-lg border border-zoom-border px-2 py-2.5 text-sm focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" /></div></div>
          <label className="grid grid-cols-[92px_1fr] items-center gap-3 text-sm font-medium text-zoom-heading">Duration<select name="duration" className="rounded-lg border border-zoom-border px-3 py-2.5 text-sm font-normal focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 minutes</option></select></label>
          {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
          <div className="flex justify-end gap-2 border-t border-zoom-border pt-4"><button type="button" onClick={closeModal} className="rounded-lg border border-zoom-border px-4 py-2.5 text-sm font-semibold text-zoom-heading hover:bg-zoom-panel">Cancel</button><button disabled={busy} className="rounded-lg bg-zoom-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zoom-blue-hover disabled:opacity-60">{busy ? "Saving…" : "Save"}</button></div>
        </form>
      </Modal>}
    </div>
  );
}
