"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { getMeeting, getParticipants, leaveMeeting, type Meeting, type Participant } from "@/lib/api";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${rest}`;
}

function MicIcon({ crossed }: { crossed: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />{crossed && <path d="m4 4 16 16" />}</svg>;
}

function CameraIcon({ crossed }: { crossed: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="3" /><path d="m15 10 6-3v10l-6-3" />{crossed && <path d="m4 4 16 16" />}</svg>;
}

function ParticipantTile({ name, local, videoRef, videoOff }: {
  name: string;
  local?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
  videoOff?: boolean;
}) {
  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-[#292929]">
      {local && !videoOff ? <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" /> : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#414141] text-2xl font-semibold text-white">{initials(name)}</div>
      )}
      <div className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2 py-1 text-sm text-white">{name}{local ? " (You)" : ""}</div>
    </div>
  );
}

export default function MeetingRoom({ code, displayName }: { code: string; displayName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoOff, setVideoOff] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    const savedId = Number(sessionStorage.getItem(`meeting-participant:${code}`));
    if (savedId > 0) {
      setParticipantId(savedId);
    } else {
      window.location.href = `/join/${code}?name=${encodeURIComponent(displayName)}`;
    }
  }, [code, displayName]);

  useEffect(() => {
    if (!participantId) return;
    let active = true;
    const refreshParticipants = () => getParticipants(code).then((result) => {
      if (active) setParticipants(result.filter((person) => !person.left_at));
    }).catch(() => {
      if (active) setNotice("Participant list is unavailable right now.");
    });

    getMeeting(code).then((result) => { if (active) setMeeting(result); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Meeting could not be loaded");
    });
    refreshParticipants();
    const refreshTimer = window.setInterval(refreshParticipants, 5000);

    // Start the camera and microphone once when the meeting room opens.
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("Camera and microphone are not available in this browser.");
    } else {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setMuted(!audioTrack || !audioTrack.enabled);
        setVideoOff(!videoTrack || !videoTrack.enabled);
        if (!videoTrack) setNotice("No camera was found. Your tile is showing your initials.");
        else if (!audioTrack) setNotice("No microphone was found. Your tile is showing video only.");
      }).catch(() => {
        if (active) {
          setMuted(true);
          setVideoOff(true);
          setNotice("Camera or microphone access was denied. Your tile is showing your initials.");
        }
      });
    }

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      // Stop tracks on navigation so the camera light turns off.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [code, participantId]);

  useEffect(() => {
    if (!participantId) return;
    const storageKey = `meeting-participant:${code}`;
    const handlePageHide = () => {
      // keepalive lets the leave request finish while the page is closing.
      leaveMeeting(code, participantId, true).catch(() => {});
      sessionStorage.removeItem(storageKey);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [code, participantId]);

  useEffect(() => {
    // The video element appears only while video is on, so attach the stream when it mounts.
    if (!videoOff && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [videoOff]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleMute() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = muted;
    setMuted(!muted);
  }

  function toggleVideo() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = videoOff;
    setVideoOff(!videoOff);
  }

  async function handleLeave() {
    if (participantId) await leaveMeeting(code, participantId).catch(() => {});
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sessionStorage.removeItem(`meeting-participant:${code}`);
    window.location.href = "/";
  }

  const otherPeople = participants.filter((person) => person.id !== participantId && person.display_name !== displayName);
  const participantNames = [displayName, ...otherPeople.map((person) => person.display_name)];

  return (
    <main className="flex h-screen min-h-[560px] flex-col overflow-hidden bg-[#1C1C1C] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <div className="min-w-0"><h1 className="truncate text-sm font-semibold sm:text-base">{error ? "Meeting unavailable" : meeting?.title ?? "Joining meeting…"}</h1><p className="mt-0.5 text-xs text-white/50">Meeting ID: {code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p></div>
        <div className="rounded-md bg-black/30 px-3 py-1.5 font-mono text-xs tabular-nums text-white/80">{formatTime(elapsed)}</div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col items-center justify-center p-4 sm:p-8">
          {error ? <p role="alert" className="text-center text-sm text-red-300">{error}</p> : <>
            {notice && <p role="status" className="mb-4 rounded-lg bg-[#333] px-4 py-2 text-center text-xs text-white/70">{notice}</p>}
            <div className="grid h-full max-h-[720px] w-full max-w-6xl grid-cols-1 grid-rows-3 gap-3 md:grid-cols-2 md:grid-rows-2 xl:grid-cols-3 xl:grid-rows-1">
              <ParticipantTile name={displayName || "You"} local videoRef={videoRef} videoOff={videoOff} />
              {otherPeople.map((person) => <ParticipantTile key={person.id} name={person.display_name} />)}
            </div>
          </>}
        </section>

        {showParticipants && <aside className="w-72 shrink-0 border-l border-white/10 bg-[#242424] p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Participants <span className="text-sm font-normal text-white/50">{participantNames.length}</span></h2><button type="button" onClick={() => setShowParticipants(false)} aria-label="Close participants" className="text-xl text-white/60">×</button></div>
          <ul className="mt-5 space-y-3">{participantNames.map((name, index) => <li key={`${name}-${index}`} className="flex items-center gap-3 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#414141] text-xs font-semibold">{initials(name)}</span>{name}{index === 0 && <span className="ml-auto text-xs text-white/40">You</span>}</li>)}</ul>
        </aside>}
      </div>

      <footer className="flex min-h-[92px] shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-white/10 bg-[#202020] px-3 sm:gap-4 sm:px-6">
        <button type="button" onClick={toggleMute} className={`flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white hover:bg-white/10 sm:min-w-[76px] sm:text-xs ${muted ? "text-red-300" : ""}`}><span className={`relative rounded-lg p-2 ${muted ? "bg-red-600" : "bg-[#3a3a3a]"}`}><MicIcon crossed={muted} />{muted && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-[#202020]" />}</span>{muted ? "Unmute" : "Mute"}</button>
        <button type="button" onClick={toggleVideo} className={`flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white hover:bg-white/10 sm:min-w-[76px] sm:text-xs ${videoOff ? "text-red-300" : ""}`}><span className={`relative rounded-lg p-2 ${videoOff ? "bg-red-600" : "bg-[#3a3a3a]"}`}><CameraIcon crossed={videoOff} />{videoOff && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-[#202020]" />}</span>{videoOff ? "Start Video" : "Stop Video"}</button>
        <button type="button" onClick={() => setShowParticipants(!showParticipants)} className={`flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white hover:bg-white/10 sm:min-w-[76px] sm:text-xs`}><span className="rounded-lg bg-[#3a3a3a] p-2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-9a3 3 0 1 0 0-6m1 10a5 5 0 0 1 3 5" /></svg></span>Participants</button>
        <button type="button" className="flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white hover:bg-white/10 sm:min-w-[76px] sm:text-xs"><span className="rounded-lg bg-[#3a3a3a] p-2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg></span>Chat</button>
        <button type="button" className="flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white hover:bg-white/10 sm:min-w-[76px] sm:text-xs"><span className="rounded-lg bg-[#3a3a3a] p-2"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="12" rx="2" /><path d="M12 16v4m-4 0h8M8 10l3-3 2 2 3-3" /></svg></span>Share Screen</button>
        <button type="button" onClick={handleLeave} className="ml-1 rounded-lg bg-[#d93025] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#b9251c] sm:ml-4 sm:px-6 sm:text-sm">Leave</button>
      </footer>
    </main>
  );
}
