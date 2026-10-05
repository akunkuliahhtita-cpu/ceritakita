"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInMood } from "@/app/app/actions";

const moods = [
  { score: 1, emoji: "😞", label: "Berat" },
  { score: 2, emoji: "😕", label: "Kurang baik" },
  { score: 3, emoji: "😐", label: "Biasa saja" },
  { score: 4, emoji: "🙂", label: "Baik" },
  { score: 5, emoji: "😄", label: "Senang" },
];

export default function QuickMood({ initialScore }: { initialScore: number | null }) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const select = (next: number) => startTransition(async () => {
    setMessage("");
    try {
      const result = await checkInMood(next);
      if (result.error) setMessage(result.error);
      else {
        setScore(next);
        setMessage("Mood hari ini tersimpan. Terima kasih sudah menyapa dirimu 💜");
        router.refresh();
      }
    } catch {
      setMessage("Mood belum tersimpan. Coba lagi sebentar, ya.");
    }
  });
  return <section aria-labelledby="mood-title" className="dashboard-quick-mood"><h2 id="mood-title" className="text-xl font-medium">Apa kabarmu hari ini?</h2><p className="mt-2 text-sm text-muted">Pilih rasa yang paling dekat denganmu hari ini. Semua rasa boleh ada.</p><div role="group" aria-label="Mood hari ini" aria-busy={pending} className="dashboard-mood-options">{moods.map(mood => <button key={mood.score} type="button" disabled={pending} aria-pressed={score === mood.score} onClick={() => select(mood.score)} className="group flex flex-col items-center gap-3 rounded-2xl py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-60"><span aria-hidden="true" className={`grid h-11 w-11 place-items-center rounded-full text-3xl transition-transform duration-200 ease-out motion-safe:group-active:scale-95 sm:h-14 sm:w-14 sm:text-3xl ${score === mood.score ? "bg-blush ring-2 ring-magenta-600" : "bg-lilac/60"}`}>{mood.emoji}</span><span className="text-center text-[10px] text-muted sm:text-xs">{mood.label}</span></button>)}</div><p role="status" className="mt-3 min-h-5 text-xs text-purple-800">{pending ? "Menyimpan mood…" : message}</p></section>;
}
