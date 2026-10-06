"use client";

import { useEffect, useState } from "react";
import { getMeeting, type Meeting } from "@/lib/api";

export default function MeetingRoom({ code }: { code: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMeeting(code).then(setMeeting).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Meeting could not be loaded"));
  }, [code]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#111827] p-6 text-white">
      {error ? <p role="alert" className="text-red-300">{error}</p> : <>
        <div className="mb-8 text-center"><p className="text-sm text-slate-400">Meeting {code.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}</p><h1 className="mt-2 text-3xl font-semibold">{meeting?.title ?? "Loading meeting…"}</h1></div>
        <div className="flex h-[min(55vh,420px)] w-full max-w-4xl items-center justify-center rounded-2xl bg-[#202938] text-slate-400">Meeting room</div>
      </>}
      <button type="button" onClick={() => window.location.href = "/"} className="mt-8 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700">Leave</button>
    </main>
  );
}
