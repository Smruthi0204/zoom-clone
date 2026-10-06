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
      window.location.href = `/meeting/${code}?name=${encodeURIComponent(name)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join meeting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <a href="/" className="text-lg font-bold text-[#0B5CFF]">zoom</a>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Join meeting</h1>
        <p className="mt-2 text-sm text-slate-500">Meeting ID: {code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">Display name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#0B5CFF] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Joining…" : "Join meeting"}</button>
      </form>
    </main>
  );
}
