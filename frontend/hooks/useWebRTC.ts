"use client";

import { useEffect, useRef, useState } from "react";
import { getMeetingWebSocketUrl, type ChatMessage } from "@/lib/api";

export type ReactionEvent = {
  id: number;
  participant_id: number;
  sender_name: string;
  emoji: string;
};

export default function useWebRTC(
  code: string,
  participantId: number | null,
  localStream: MediaStream | null,
  screenTrack: MediaStreamTrack | null,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenTrackRef = useRef<MediaStreamTrack | null>(screenTrack);
  const connectionsRef = useRef(new Map<number, RTCPeerConnection>());
  const remoteStreamsRef = useRef(new Map<number, MediaStream>());
  const pendingCandidatesRef = useRef(new Map<number, RTCIceCandidateInit[]>());
  const nextReactionIdRef = useRef(0);
  const reactionTimersRef = useRef<number[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [peerIds, setPeerIds] = useState<Set<number>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [muteAllVersion, setMuteAllVersion] = useState(0);
  const [removedVersion, setRemovedVersion] = useState(0);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);

  localStreamRef.current = localStream;
  screenTrackRef.current = screenTrack;

  async function syncLocalTracks(connection: RTCPeerConnection) {
    const tracks = localStreamRef.current?.getTracks() ?? [];
    const camera = tracks.find((track) => track.kind === "video") ?? null;
    const audio = tracks.find((track) => track.kind === "audio") ?? null;
    const video = screenTrackRef.current ?? camera;

    for (const [kind, track] of [["audio", audio], ["video", video]] as const) {
      const sender = connection.getSenders().find((item) => item.track?.kind === kind)
        ?? connection.getTransceivers().find((item) => item.receiver.track.kind === kind)?.sender;
      if (track && sender && sender.track !== track) {
        await sender.replaceTrack(track);
      } else if (track && !sender) {
        // Reuse the local stream for camera and audio, and a small stream for screen video.
        const stream = track === screenTrackRef.current ? new MediaStream([track]) : localStreamRef.current;
        if (stream) connection.addTrack(track, stream);
      } else if (!track && sender?.track) {
        await sender.replaceTrack(null);
      }
    }
  }

  function removePeer(peerId: number) {
    connectionsRef.current.get(peerId)?.close();
    connectionsRef.current.delete(peerId);
    remoteStreamsRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    setRemoteStreams((current) => { const next = new Map(current); next.delete(peerId); return next; });
    setPeerIds((current) => { const next = new Set(current); next.delete(peerId); return next; });
  }

  useEffect(() => {
    if (!localStream && !screenTrack) return;
    connectionsRef.current.forEach((connection) => { syncLocalTracks(connection).catch(() => {}); });
  }, [localStream, screenTrack]);

  useEffect(() => {
    if (!participantId) return;
    let alive = true;
    let socket: WebSocket | null = null;
    const startTimer = window.setTimeout(() => {
      // Let React's development remount cancel before opening a real socket.
      socket = new WebSocket(getMeetingWebSocketUrl(code, participantId));
      socketRef.current = socket;
      socket.onopen = () => { if (alive) setConnected(true); };
      socket.onclose = () => { if (alive) setConnected(false); };
      socket.onmessage = (event) => { handleMessage(event.data).catch(() => {}); };
    }, 0);

    function sendSignal(message: object) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    }

    function makeConnection(peerId: number) {
      const existing = connectionsRef.current.get(peerId);
      if (existing) return existing;

      const connection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      // Reserve both senders so a camera track can arrive after the offer.
      connection.addTransceiver("audio", { direction: "sendrecv" });
      connection.addTransceiver("video", { direction: "sendrecv" });
      connectionsRef.current.set(peerId, connection);
      setPeerIds((current) => new Set(current).add(peerId));
      connection.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ type: "ice-candidate", target_id: peerId, payload: event.candidate.toJSON() });
      };
      connection.ontrack = (event) => {
        // Keep audio and video tracks together even if WebRTC reports separate streams.
        const stream = remoteStreamsRef.current.get(peerId) ?? new MediaStream();
        if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
        remoteStreamsRef.current.set(peerId, stream);
        setRemoteStreams((current) => new Map(current).set(peerId, stream));
      };
      syncLocalTracks(connection).catch(() => {});
      return connection;
    }

    async function flushCandidates(peerId: number, connection: RTCPeerConnection) {
      const candidates = pendingCandidatesRef.current.get(peerId) ?? [];
      pendingCandidatesRef.current.delete(peerId);
      for (const candidate of candidates) await connection.addIceCandidate(candidate);
    }

    async function createOffer(peerId: number) {
      const connection = makeConnection(peerId);
      await syncLocalTracks(connection);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendSignal({ type: "offer", target_id: peerId, payload: connection.localDescription });
    }

    async function handleMessage(raw: string) {
      const message = JSON.parse(raw);
      if (message.type === "chat") {
        setChatMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        return;
      }
      if (message.type === "mute-all") {
        setMuteAllVersion((version) => version + 1);
        return;
      }
      if (message.type === "removed") {
        setRemovedVersion((version) => version + 1);
        return;
      }
      if (message.type === "reaction" && typeof message.participant_id === "number" && typeof message.sender_name === "string" && typeof message.emoji === "string") {
        const reaction = { ...message, id: ++nextReactionIdRef.current } as ReactionEvent;
        setReactions((current) => [...current, reaction]);
        let timer = 0;
        timer = window.setTimeout(() => {
          setReactions((current) => current.filter((item) => item.id !== reaction.id));
          reactionTimersRef.current = reactionTimersRef.current.filter((activeTimer) => activeTimer !== timer);
        }, 2000);
        reactionTimersRef.current.push(timer);
        return;
      }
      if (message.type === "peers") {
        const peers = (message.peers as number[]).filter((peerId) => peerId !== participantId);
        setPeerIds(new Set(peers));
        await Promise.all(peers.map(createOffer));
        return;
      }
      if (message.type === "peer-joined") {
        makeConnection(message.participant_id);
        return;
      }
      if (message.type === "peer-left") {
        removePeer(message.participant_id);
        return;
      }
      if (!["offer", "answer", "ice-candidate"].includes(message.type)) return;

      const peerId = message.from_id as number;
      const connection = makeConnection(peerId);
      if (message.type === "offer") {
        await connection.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        await flushCandidates(peerId, connection);
        await syncLocalTracks(connection);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        sendSignal({ type: "answer", target_id: peerId, payload: connection.localDescription });
      } else if (message.type === "answer") {
        await connection.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        await flushCandidates(peerId, connection);
      } else if (message.payload) {
        const candidate = message.payload as RTCIceCandidateInit;
        if (connection.remoteDescription) await connection.addIceCandidate(candidate);
        else pendingCandidatesRef.current.set(peerId, [...(pendingCandidatesRef.current.get(peerId) ?? []), candidate]);
      }
    }

    return () => {
      alive = false;
      window.clearTimeout(startTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (socketRef.current === socket) socketRef.current = null;
      connectionsRef.current.forEach((connection) => connection.close());
      connectionsRef.current.clear();
      remoteStreamsRef.current.clear();
      pendingCandidatesRef.current.clear();
      reactionTimersRef.current.forEach(window.clearTimeout);
      reactionTimersRef.current = [];
    };
  }, [code, participantId]);

  function sendChat(text: string) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "chat", text }));
    }
  }

  function sendReaction(emoji: string) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "reaction", emoji }));
    }
  }

  function sendModeration(type: "mute-all" | "remove", targetId?: number) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, ...(targetId === undefined ? {} : { target_id: targetId }) }));
    }
  }

  function close() {
    socketRef.current?.close();
    socketRef.current = null;
    connectionsRef.current.forEach((connection) => connection.close());
    connectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingCandidatesRef.current.clear();
    reactionTimersRef.current.forEach(window.clearTimeout);
    reactionTimersRef.current = [];
    setReactions([]);
    setRemoteStreams(new Map());
    setPeerIds(new Set());
    setConnected(false);
  }

  return { remoteStreams, peerIds, chatMessages, reactions, connected, muteAllVersion, removedVersion, sendChat, sendReaction, sendModeration, close };
}
