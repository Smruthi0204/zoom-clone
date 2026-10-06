"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { getMeeting, getMeetingMessages, getParticipants, heartbeatMeeting, leaveMeeting, type ChatMessage, type Meeting, type Participant } from "@/lib/api";
import useWebRTC, { type ReactionEvent } from "@/hooks/useWebRTC";

const reactionEmojis = ["👍", "👏", "❤️", "😂", "😮", "🎉"];

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

function ParticipantTile({ name, local, videoRef, videoOff, remoteStream, micOff, reactions, className }: {
  name: string;
  local?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
  videoOff?: boolean;
  remoteStream?: MediaStream;
  micOff?: boolean;
  reactions?: ReactionEvent[];
  className?: string;
}) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const hasRemoteVideo = remoteStream?.getVideoTracks().some((track) => track.readyState === "live") ?? false;

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className={`relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden rounded-lg bg-zoom-room-tile ${className ?? ""}`}>
      {local && !videoOff ? <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" /> : !local && remoteStream ? <>
        <video ref={remoteVideoRef} autoPlay playsInline className={hasRemoteVideo ? "absolute inset-0 h-full w-full object-cover" : "hidden"} />
        {!hasRemoteVideo && <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#414141] text-2xl font-semibold text-white">{initials(name)}</div>}
      </> : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#414141] text-2xl font-semibold text-white">{initials(name)}</div>
      )}
      {micOff && <span className="absolute right-3 top-3 rounded bg-black/55 p-1.5 text-red-400" aria-label="Microphone off"><MicIcon crossed /></span>}
      {reactions?.map((reaction) => <div key={reaction.id} className="reaction-float absolute bottom-1/3 left-1/2 z-20 flex flex-col items-center drop-shadow-lg"><span className="text-5xl">{reaction.emoji}</span><span className="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{reaction.sender_name}</span></div>)}
      <div className="absolute bottom-3 left-3 rounded bg-black/55 px-2 py-1 text-xs text-white">{name}{local ? " (You)" : ""}</div>
    </div>
  );
}

function ScreenIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8" /></svg>;
}

export default function MeetingRoom({ code, displayName }: { code: string; displayName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const muteAllRef = useRef(false);
  const chatOpenRef = useRef(false);
  const seenChatIdsRef = useRef(new Set<number>());
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [role, setRole] = useState<"host" | "participant">("participant");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoOff, setVideoOff] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sidePanel, setSidePanel] = useState<"participants" | "chat" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatError, setChatError] = useState("");
  const [unread, setUnread] = useState(0);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [reactionOpen, setReactionOpen] = useState(false);
  const { remoteStreams, peerIds, chatMessages: incomingMessages, reactions, connected: socketConnected, muteAllVersion, removedVersion, sendChat: sendLiveChat, sendReaction, sendModeration, close: closeWebRTC } = useWebRTC(
    code, participantId, localStream, screenStream?.getVideoTracks()[0] ?? null,
  );

  function stopHeartbeat() {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }

  useEffect(() => {
    const savedId = Number(sessionStorage.getItem(`meeting-participant:${code}`));
    if (savedId > 0) {
      setParticipantId(savedId);
      setRole(sessionStorage.getItem(`meeting-role:${code}`) === "host" ? "host" : "participant");
    } else {
      window.location.href = `/join/${code}?name=${encodeURIComponent(displayName)}`;
    }
  }, [code, displayName]);

  useEffect(() => {
    if (!muteAllVersion) return;
    muteAllRef.current = true;
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = false;
    setMuted(true);
  }, [muteAllVersion]);

  useEffect(() => {
    if (!removedVersion) return;
    stopHeartbeat();
    closeWebRTC();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    sessionStorage.removeItem(`meeting-participant:${code}`);
    sessionStorage.removeItem(`meeting-role:${code}`);
    sessionStorage.setItem("dashboard-message", "You were removed by the host.");
    window.location.href = "/";
  }, [removedVersion, code]);

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
    heartbeatMeeting(code, participantId).catch(() => {});
    heartbeatTimerRef.current = window.setInterval(() => {
      heartbeatMeeting(code, participantId).catch(() => {});
    }, 5000);

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
        setLocalStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        if (muteAllRef.current && audioTrack) audioTrack.enabled = false;
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
      stopHeartbeat();
      // Stop tracks on navigation so the camera light turns off.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [code, participantId]);

  useEffect(() => {
    const newMessages = incomingMessages.filter((message) => !seenChatIdsRef.current.has(message.id));
    incomingMessages.forEach((message) => seenChatIdsRef.current.add(message.id));
    if (!newMessages.length) return;
    setMessages((current) => {
      const combined = new Map([...current, ...newMessages].map((message) => [message.id, message]));
      return Array.from(combined.values()).sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at));
    });
    if (!chatOpenRef.current) setUnread((count) => count + newMessages.length);
  }, [incomingMessages]);

  useEffect(() => {
    chatOpenRef.current = sidePanel === "chat";
    if (sidePanel === "chat") setUnread(0);
  }, [sidePanel]);

  useEffect(() => {
    if (!reactionOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!reactionPickerRef.current?.contains(event.target as Node)) setReactionOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [reactionOpen]);

  useEffect(() => {
    if (sidePanel !== "chat") return;
    let active = true;
    setChatError("");
    getMeetingMessages(code).then((history) => {
      if (!active) return;
      setMessages((current) => {
        const combined = new Map([...history, ...current].map((message) => [message.id, message]));
        return Array.from(combined.values()).sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at));
      });
    }).catch((error: unknown) => {
      if (active) setChatError(error instanceof Error ? error.message : "Could not load chat history");
    });
    return () => { active = false; };
  }, [code, sidePanel]);

  useEffect(() => {
    if (!participantId) return;
    const storageKey = `meeting-participant:${code}`;
    const handlePageHide = () => {
      stopHeartbeat();
      closeWebRTC();
      // Keepalive with JSON lets FastAPI accept the leave request during page close.
      leaveMeeting(code, participantId, true).catch(() => {});
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(`meeting-role:${code}`);
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
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => () => {
    // Screen capture must stop even if the user leaves by navigating away.
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleMute() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    muteAllRef.current = false;
    track.enabled = muted;
    setMuted(!muted);
  }

  function toggleVideo() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = videoOff;
    setVideoOff(!videoOff);
  }

  function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopScreenShare();
      return;
    }

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screen.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare, { once: true });
      screenStreamRef.current = screen;
      setScreenStream(screen);
    } catch {
      // Closing the picker or denying access should leave the meeting unchanged.
    }
  }

  async function handleLeave() {
    stopHeartbeat();
    closeWebRTC();
    if (participantId) await leaveMeeting(code, participantId).catch(() => {});
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopScreenShare();
    setLocalStream(null);
    sessionStorage.removeItem(`meeting-participant:${code}`);
    sessionStorage.removeItem(`meeting-role:${code}`);
    window.location.href = "/";
  }

  function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || !socketConnected) return;
    sendLiveChat(text);
    setChatText("");
  }

  const otherPeople = participants.filter((person) => person.id !== participantId && peerIds.has(person.id));
  const panelPeople = [
    { id: participantId, name: displayName, role },
    ...otherPeople.map((person) => ({ id: person.id, name: person.display_name, role: person.role })),
  ];

  return (
    <main className="flex h-screen min-h-[560px] flex-col overflow-hidden bg-zoom-room text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">◆</span><div className="min-w-0"><h1 className="truncate text-sm font-semibold sm:text-base">{error ? "Meeting unavailable" : meeting?.title ?? "Joining meeting…"}</h1><p className="mt-0.5 text-[11px] text-white/50">Meeting ID: {code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p></div></div>
        <div className="flex items-center gap-2"><button type="button" className="rounded-md px-3 py-1.5 text-xs text-white/75 hover:bg-zoom-room-tile">View</button><div className="rounded-md bg-black/30 px-3 py-1.5 font-mono text-xs tabular-nums text-white/80">{formatTime(elapsed)}</div></div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col items-center justify-center p-4 sm:p-8">
          {error ? <p role="alert" className="text-center text-sm text-red-300">{error}</p> : <>
            {notice && <p role="status" className="mb-4 rounded-lg bg-[#333] px-4 py-2 text-center text-xs text-white/70">{notice}</p>}
            {screenStream ? <div className="grid h-full max-h-[720px] w-full max-w-6xl grid-rows-[minmax(0,1fr)_auto] gap-3">
              <div className="relative min-h-0 overflow-hidden rounded-xl bg-black"><video ref={screenVideoRef} autoPlay playsInline className="h-full w-full object-contain" /><span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-sm">{displayName}&apos;s screen</span></div>
              <div className="flex h-[clamp(100px,22vh,180px)] justify-center gap-3 overflow-x-auto">
                <div className="aspect-video h-full shrink-0"><ParticipantTile name={displayName || "You"} local videoRef={videoRef} videoOff={videoOff} micOff={muted} reactions={reactions.filter((reaction) => reaction.participant_id === participantId)} className="ring-2 ring-emerald-400" /></div>
                {otherPeople.map((person) => <div key={person.id} className="aspect-video h-full shrink-0"><ParticipantTile name={person.display_name} remoteStream={remoteStreams.get(person.id)} reactions={reactions.filter((reaction) => reaction.participant_id === person.id)} /></div>)}
              </div>
            </div> : <div className="grid h-full max-h-[720px] w-full max-w-6xl auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ParticipantTile name={displayName || "You"} local videoRef={videoRef} videoOff={videoOff} micOff={muted} reactions={reactions.filter((reaction) => reaction.participant_id === participantId)} className="ring-2 ring-emerald-400" />
              {otherPeople.map((person) => <ParticipantTile key={person.id} name={person.display_name} remoteStream={remoteStreams.get(person.id)} reactions={reactions.filter((reaction) => reaction.participant_id === person.id)} />)}
            </div>}
          </>}
        </section>

        {sidePanel === "participants" && <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-zoom-room-panel p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Participants <span className="text-sm font-normal text-white/50">{panelPeople.length}</span></h2><button type="button" onClick={() => setSidePanel(null)} aria-label="Close participants" className="text-xl text-white/60">×</button></div>
          <ul className="mt-5 space-y-3">{panelPeople.map((person) => <li key={person.id ?? "self"} className="flex items-center gap-2 text-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#414141] text-xs font-semibold">{initials(person.name)}</span><span className="min-w-0 flex-1 truncate">{person.name}{person.id === participantId && <span className="ml-1 text-xs text-white/40">You</span>}{person.role === "host" && <span className="ml-1 rounded bg-zoom-blue/20 px-1.5 py-0.5 text-[10px] text-blue-200">Host</span>}</span>{role === "host" && person.id !== participantId && <button type="button" onClick={() => { if (window.confirm(`Remove ${person.name} from this meeting?`)) sendModeration("remove", person.id ?? undefined); }} className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium hover:bg-red-600">Remove</button>}</li>)}</ul>
          {role === "host" && <button type="button" onClick={() => sendModeration("mute-all")} className="mt-auto rounded-lg bg-[#3a3a3a] px-3 py-2.5 text-sm font-semibold hover:bg-[#4a4a4a]">Mute all</button>}
        </aside>}

        {sidePanel === "chat" && <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-zoom-room-panel p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3"><h2 className="font-semibold">Meeting chat</h2><button type="button" onClick={() => setSidePanel(null)} aria-label="Close chat" className="text-xl text-white/60">×</button></div>
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {chatError && <p role="alert" className="text-xs text-red-300">{chatError}</p>}
            {!messages.length && <p className="text-center text-xs text-white/45">No messages yet. Say hello!</p>}
            {messages.map((message) => <div key={message.id} className={`flex ${message.participant_id === participantId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 ${message.participant_id === participantId ? "bg-zoom-blue" : "bg-[#383838]"}`}>
                <p className="mb-1 text-[11px] font-semibold text-white/70">{message.sender_name} <time className="ml-1 font-normal">{new Date(message.sent_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></p>
                <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              </div>
            </div>)}
          </div>
          <form onSubmit={sendChat} className="flex gap-2 border-t border-white/10 pt-3">
            <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={socketConnected ? "Write a message" : "Connecting…"} disabled={!socketConnected} className="min-w-0 flex-1 rounded-lg bg-[#383838] px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-1 focus:ring-zoom-blue" />
            <button disabled={!socketConnected || !chatText.trim()} className="rounded-lg bg-zoom-blue px-3 text-sm font-semibold disabled:opacity-50">Send</button>
          </form>
        </aside>}
      </div>

      <footer className="flex min-h-[84px] shrink-0 items-center justify-center gap-1 overflow-x-auto border-t border-white/10 bg-zoom-room px-3 sm:gap-2 sm:px-6">
        <button type="button" onClick={toggleMute} className={`flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white transition hover:bg-zoom-room-tile sm:min-w-[76px] sm:text-xs ${muted ? "text-red-300" : ""}`}><span className={`relative p-1.5 ${muted ? "text-red-400" : ""}`}><MicIcon crossed={muted} />{muted && <span className="absolute inset-1.5 rounded-sm border-r-2 border-red-500" />}</span>{muted ? "Unmute" : "Mute"}</button>
        <button type="button" onClick={toggleVideo} className={`flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white transition hover:bg-zoom-room-tile sm:min-w-[76px] sm:text-xs ${videoOff ? "text-red-300" : ""}`}><span className={`relative p-1.5 ${videoOff ? "text-red-400" : ""}`}><CameraIcon crossed={videoOff} />{videoOff && <span className="absolute inset-1.5 rounded-sm border-r-2 border-red-500" />}</span>{videoOff ? "Start Video" : "Stop Video"}</button>
        <button type="button" onClick={() => setSidePanel(sidePanel === "participants" ? null : "participants")} className="relative flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white transition hover:bg-zoom-room-tile sm:min-w-[76px] sm:text-xs"><span className="p-1.5"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-9a3 3 0 1 0 0-6m1 10a5 5 0 0 1 3 5" /></svg><span className="absolute right-2 top-1 rounded-full bg-[#484848] px-1 text-[9px]">{panelPeople.length}</span></span>Participants</button>
        <button type="button" onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")} className="relative flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white transition hover:bg-zoom-room-tile sm:min-w-[76px] sm:text-xs"><span className="p-1.5"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg></span>Chat{unread > 0 && sidePanel !== "chat" && <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>
        <button type="button" onClick={toggleScreenShare} className={`flex min-w-[70px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] transition hover:bg-zoom-room-tile sm:min-w-[84px] sm:text-xs ${screenStream ? "text-green-300" : "text-white"}`}><span className="p-1.5 text-green-400"><ScreenIcon /></span>{screenStream ? "Stop Share" : "Share Screen"}</button>
        <div ref={reactionPickerRef} className="relative">
          <button type="button" onClick={() => setReactionOpen((open) => !open)} aria-expanded={reactionOpen} className="flex min-w-[62px] flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white transition hover:bg-zoom-room-tile sm:min-w-[76px] sm:text-xs"><span className="p-1.5">✧</span>Reactions</button>
          {reactionOpen && <div className="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 gap-1 rounded-xl border border-white/10 bg-[#2B2B2B] p-2 shadow-xl">{reactionEmojis.map((emoji) => <button key={emoji} type="button" onClick={() => { sendReaction(emoji); setReactionOpen(false); }} aria-label={`Send ${emoji} reaction`} className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition hover:bg-white/10">{emoji}</button>)}</div>}
        </div>
        <button type="button" onClick={handleLeave} className="ml-auto rounded-lg bg-zoom-red px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 sm:px-6 sm:text-sm">Leave</button>
      </footer>
    </main>
  );
}
