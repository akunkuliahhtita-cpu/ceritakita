"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { deleteJournal, saveJournal, type JournalEntry } from "@/app/app/jurnal/actions";

const moodLabels = ["😞 Berat", "😕 Kurang baik", "😐 Biasa saja", "🙂 Baik", "😄 Senang"];

export default function JournalWorkspace({ initialEntries }: { initialEntries: JournalEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [editing, setEditing] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  function reset() {
    setEditing(undefined);
    setTitle("");
    setContent("");
    setMood("");
  }
  function edit(entry: JournalEntry) {
    setEditing(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood_score === null ? "" : String(entry.mood_score));
    setConfirmDelete(null);
    setMessage("");
    titleRef.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const score = mood === "" ? null : Number(mood);
    if (!title.trim() || title.trim().length > 120 || !content.trim() || content.trim().length > 20000 || (score !== null && (!Number.isInteger(score) || score < 1 || score > 5))) {
      setMessage("Isi judul dan ceritamu, lalu pilih mood 1–5 atau kosongkan.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveJournal({ id: editing, title, content, mood_score: score });
        if (result.error !== null) { setMessage(result.error); return; }
        setEntries(current => [result.entry, ...current.filter(entry => entry.id !== result.entry.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        reset();
        setMessage("Jurnal tersimpan. Terima kasih sudah memberi ruang untuk dirimu 💜");
      } catch { setMessage("Jurnal belum tersimpan. Coba lagi sebentar, ya."); }
    });
  }
  function remove(id: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteJournal(id);
        if (result.error) { setMessage(result.error); return; }
        setEntries(current => current.filter(entry => entry.id !== id));
        setConfirmDelete(null);
        if (editing === id) reset();
        setMessage("Jurnal sudah dihapus.");
      } catch { setMessage("Jurnal belum dihapus. Coba lagi sebentar, ya."); }
    });
  }

  return <div className="mt-8">
    <form onSubmit={submit} aria-busy={pending} className="rounded-[36px] bg-white p-5 shadow-soft sm:p-8">
      <h2 className="text-xl font-medium">{editing ? "Edit ceritamu" : "Tulis cerita untuk dirimu"}</h2>
      <fieldset disabled={pending} className="mt-6 space-y-5">
        <div><label htmlFor="journal-title" className="text-sm font-medium">Judul</label><input ref={titleRef} id="journal-title" required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="Hari ini, aku…" className="mt-2 w-full rounded-full border border-[#EADFF2] bg-lilac/20 px-5 py-3 text-sm focus:outline-purple-600" /></div>
        <div><label htmlFor="journal-content" className="text-sm font-medium">Ceritamu</label><textarea id="journal-content" required maxLength={20000} rows={7} value={content} onChange={event => setContent(event.target.value)} placeholder="Tidak perlu kata-kata sempurna. Mulai dari apa yang kamu rasakan." aria-describedby="journal-count" className="mt-2 w-full resize-y rounded-[24px] border border-[#EADFF2] bg-lilac/20 p-5 text-sm leading-relaxed focus:outline-purple-600" /><p id="journal-count" className="mt-1 text-right text-xs text-muted">{content.length}/20.000 karakter</p></div>
        <div><label htmlFor="journal-mood" className="text-sm font-medium">Mood <span className="text-muted">(opsional)</span></label><select id="journal-mood" value={mood} onChange={event => setMood(event.target.value)} className="mt-2 block w-full rounded-full border border-[#EADFF2] bg-white px-5 py-3 text-sm focus:outline-purple-600 sm:max-w-xs"><option value="">Tanpa mood</option>{moodLabels.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></div>
        <div className="flex flex-wrap gap-3"><button type="submit" className="btn btn-brand disabled:opacity-60">{pending ? "Memproses…" : editing ? "Simpan perubahan →" : "Simpan jurnal →"}</button>{editing && <button type="button" onClick={reset} className="btn btn-ghost">Batal edit</button>}</div>
      </fieldset>
    </form>
    <p role="status" className="my-4 min-h-6 text-sm text-purple-800">{message}</p>
    <section aria-labelledby="journal-list-title"><h2 id="journal-list-title" className="mb-5 text-xl font-medium">Catatanmu <span className="text-sm text-muted">({entries.length})</span></h2>
      {entries.length === 0 ? <div className="rounded-[36px] bg-lilac p-8 text-sm leading-relaxed text-muted">Belum ada jurnal. Cerita pertamamu boleh sesederhana satu kalimat.</div> : <div className="grid gap-5">{entries.map(entry => <article key={entry.id} id={`journal-${entry.id}`} className="rounded-[36px] bg-white p-5 shadow-soft transition-[transform,box-shadow] duration-[250ms] ease-out motion-safe:[@media(hover:hover)]:hover:-translate-y-1 motion-safe:[@media(hover:hover)]:hover:shadow-lg sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(entry.created_at))}</p>{entry.mood_score !== null && entry.mood_score >= 1 && entry.mood_score <= 5 && <span className="rounded-full bg-blush px-3 py-1.5 text-xs text-purple-800">{moodLabels[entry.mood_score - 1]}</span>}</div>
        <h3 className="mt-4 break-words text-xl font-medium">{entry.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{entry.content}</p>
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => edit(entry)} aria-label={`Edit jurnal ${entry.title}`} className="btn btn-ghost text-xs disabled:opacity-60">Edit ↗</button><button type="button" disabled={pending} onClick={() => setConfirmDelete(entry.id)} aria-label={`Hapus jurnal ${entry.title}`} className="btn btn-ghost text-xs disabled:opacity-60">Hapus</button></div>
        {confirmDelete === entry.id && <div className="mt-4 rounded-2xl bg-peach p-4"><p className="text-sm">Hapus jurnal ini? Catatan yang dihapus tidak bisa dikembalikan.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => remove(entry.id)} className="btn btn-brand text-xs disabled:opacity-60">Ya, hapus</button><button type="button" disabled={pending} onClick={() => setConfirmDelete(null)} className="btn btn-ghost text-xs">Batal</button></div></div>}
      </article>)}</div>}
    </section>
  </div>;
}
