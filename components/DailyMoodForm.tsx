"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveDailyMood } from "@/app/app/mood/actions";

const moods = [
  { score: 1, emoji: "😞", label: "Berat" },
  { score: 2, emoji: "😕", label: "Kurang baik" },
  { score: 3, emoji: "😐", label: "Biasa saja" },
  { score: 4, emoji: "🙂", label: "Baik" },
  { score: 5, emoji: "😄", label: "Senang" },
];
const tags = ["Tenang", "Senang", "Bersyukur", "Lelah", "Sedih", "Cemas", "Kesepian", "Bersemangat"];

export default function DailyMoodForm({ initial }: { initial: { score: number | null; emotions: string[]; note: string } }) {
  const [score, setScore] = useState(initial.score);
  const [emotions, setEmotions] = useState(initial.emotions);
  const [note, setNote] = useState(initial.note);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (score === null || !Number.isInteger(score) || score < 1 || score > 5 || emotions.length > 5 || note.trim().length > 500) {
      setMessage("Pilih mood dulu, ya. Catatan maksimal 500 karakter dan tag maksimal 5.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveDailyMood({ score, emotions, note });
        setMessage(result.error ?? "Mood hari ini tersimpan. Terima kasih sudah merawat dirimu 💜");
        if (!result.error) router.refresh();
      } catch {
        setMessage("Mood belum tersimpan. Coba lagi sebentar, ya.");
      }
    });
  }

  return <form onSubmit={submit} aria-busy={pending} className="mt-8 rounded-[36px] bg-white p-5 shadow-soft sm:p-8">
    <h2 className="text-xl font-medium">Apa yang kamu rasakan hari ini?</h2>
    <p className="mt-2 text-sm text-muted">Satu catatan per hari. Kamu boleh mengubahnya kapan saja hari ini.</p>
    <fieldset disabled={pending} className="mt-6">
      <legend className="text-sm font-medium">Pilih mood <span className="text-muted">(wajib)</span></legend>
      <div className="mt-3 grid grid-cols-5 gap-2">{moods.map(mood => <button key={mood.score} type="button" aria-pressed={score === mood.score} onClick={() => setScore(mood.score)} className="flex flex-col items-center gap-2 rounded-2xl py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-60"><span aria-hidden="true" className={`grid h-12 w-12 place-items-center rounded-full text-3xl sm:h-16 sm:w-16 sm:text-4xl ${score === mood.score ? "bg-blush ring-2 ring-magenta-600" : "bg-lilac"}`}>{mood.emoji}</span><span className="text-center text-[10px] text-muted sm:text-xs">{mood.label} · {mood.score}</span></button>)}</div>
    </fieldset>
    <fieldset disabled={pending} className="mt-6">
      <legend className="text-sm font-medium">Tag perasaan <span className="text-muted">(opsional, maksimal 5)</span></legend>
      <div className="mt-3 flex flex-wrap gap-2">{tags.map(tag => <button key={tag} type="button" aria-pressed={emotions.includes(tag)} disabled={!emotions.includes(tag) && emotions.length >= 5} onClick={() => setEmotions(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])} className={`rounded-full border px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 disabled:opacity-50 ${emotions.includes(tag) ? "border-purple-600 bg-lilac text-purple-800" : "border-[#EADFF2] text-muted"}`}>{tag}</button>)}</div>
    </fieldset>
    <label htmlFor="mood-note" className="mt-6 block text-sm font-medium">Catatan singkat <span className="text-muted">(opsional)</span></label>
    <textarea id="mood-note" value={note} onChange={event => setNote(event.target.value)} disabled={pending} maxLength={500} rows={4} aria-describedby="note-count" placeholder="Ada hal kecil yang ingin kamu ingat hari ini?" className="mt-3 w-full resize-y rounded-2xl border border-[#EADFF2] bg-lilac/20 p-4 text-sm focus:outline-purple-600" />
    <p id="note-count" className="mt-1 text-right text-xs text-muted">{note.length}/500 karakter</p>
    <button type="submit" disabled={pending} className="btn btn-brand mt-5 disabled:opacity-60">{pending ? "Menyimpan…" : "Simpan mood hari ini →"}</button>
    <p role="status" className="mt-4 min-h-6 text-sm text-purple-800">{message}</p>
  </form>;
}
