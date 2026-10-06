"use client";

import { useState, type FormEvent } from "react";
import { getMeeting, joinMeeting } from "@/lib/api";

export default function JoinMeetingForm({ code, initialName }: { code: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await getMeeting(code);
      const participant = await joinMeeting(code, name);
      sessionStorage.setItem(`meeting-participant:${code}`, String(participant.id));
      sessionStorage.setItem(`meeting-role:${code}`, participant.role);
      window.location.href = `/meeting/${code}?name=${encodeURIComponent(name)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join meeting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zoom-panel p-5">
      <form onSubmit={submit} className="w-full max-w-[440px] rounded-xl border border-zoom-border bg-white p-7 shadow-[0_18px_60px_rgba(14,29,46,0.12)]">
        <a href="/" className="text-lg font-bold text-zoom-blue">zoom</a>
        <h1 className="mt-6 text-2xl font-semibold text-zoom-heading">Join meeting</h1>
        <p className="mt-2 text-sm text-zoom-muted">Meeting ID: {code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p>
        <label className="mt-6 block text-sm font-medium text-zoom-heading">Display name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-zoom-border px-3 py-2.5 focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20" /></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-lg bg-zoom-blue px-4 py-3 font-semibold text-white transition hover:bg-zoom-blue-hover disabled:opacity-60">{busy ? "Joining…" : "Join meeting"}</button>
      </form>
    </main>
  );
}
