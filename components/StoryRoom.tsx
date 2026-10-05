"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { commentOnStory, publishStory, reactToStory, reportContent } from "@/app/app/cerita/actions";
import { crisisPattern, type CrisisHelp, type ReactionType, type Story } from "@/app/app/cerita/types";

const reactions: { type: ReactionType; label: string; icon: string }[] = [
  { type: "peluk", label: "Peluk", icon: "🤗" },
  { type: "semangat", label: "Semangat", icon: "💪" },
  { type: "aku_juga", label: "Aku juga", icon: "💜" },
];
const field = "mt-2 w-full rounded-2xl border border-[#EADFF2] bg-lilac/20 p-4 text-sm focus:outline-purple-600";

function HelpCard({ help }: { help: CrisisHelp | null }) {
  return <aside role="note" className="my-4 rounded-[24px] bg-peach p-5 text-sm leading-relaxed"><h3 className="font-semibold text-purple-800">Kamu tidak harus melewati ini sendirian.</h3><p className="mt-2">Kalau kamu merasa tidak aman atau ingin menyakiti diri, coba hubungi orang yang kamu percaya dan cari bantuan langsung di IGD terdekat.</p>{help ? <><p className="mt-2">Dukungan psikologis: {help.phone}. Darurat medis: {help.emergency}.</p><a href={help.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-4 text-xs">{help.label} ↗</a><p className="mt-3"><a href={help.source} target="_blank" rel="noopener noreferrer" className="underline">Informasi resmi layanan</a></p></> : <p className="mt-2">Kontak bantuan belum tersedia di situs. Minta seseorang menemanimu mencari layanan kesehatan terdekat.</p>}</aside>;
}

function ReportButton({ id, type }: { id: string; type: "story" | "comment" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!["spam", "sara", "kekerasan", "lainnya"].includes(reason) || detail.trim().length > 1000) {
      setMessage("Pilih alasan laporan dan isi detail maksimal 1.000 karakter."); return;
    }
    startTransition(async () => {
      try {
        const result = await reportContent(type, id, reason, detail);
        setMessage(result.error ?? "Laporan terkirim. Terima kasih sudah menjaga ruang ini.");
        if (!result.error) { setOpen(false); setDetail(""); }
      } catch { setMessage("Laporan belum terkirim. Coba lagi sebentar, ya."); }
    });
  }
  return <div className="mt-3"><button type="button" disabled={pending} aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 rounded-full px-3 text-xs text-muted underline decoration-lilac underline-offset-4 focus-visible:outline-purple-600">{open ? "Tutup laporan" : "Laporkan"}</button>{open && <form onSubmit={submit} className="mt-2 rounded-2xl bg-peach/60 p-4"><label className="block text-xs font-medium">Alasan laporan<select value={reason} disabled={pending} onChange={event => setReason(event.target.value)} className={field}><option value="spam">Spam</option><option value="sara">SARA</option><option value="kekerasan">Kekerasan</option><option value="lainnya">Lainnya</option></select></label><label className="mt-4 block text-xs font-medium">Detail (opsional)<textarea value={detail} disabled={pending} onChange={event => setDetail(event.target.value)} maxLength={1000} rows={2} className={field} /></label><button type="submit" disabled={pending} className="btn btn-ghost mt-3 text-xs disabled:opacity-60">{pending ? "Mengirim…" : "Kirim laporan →"}</button></form>}<p role="status" className="text-xs leading-relaxed text-purple-800">{message}</p></div>;
}

function StoryCard({ story, help, commentError }: { story: Story; help: CrisisHelp | null; commentError: boolean }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [pending, startTransition] = useTransition();
  function react(type: ReactionType) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reactToStory(story.id, type, !story.mine[type]);
        if (result.error) setMessage(result.error);
        else router.refresh();
      } catch { setMessage("Reaksi belum tersimpan. Coba lagi sebentar, ya."); }
    });
  }
  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim() || comment.trim().length > 1000) { setMessage("Tulis komentar maksimal 1.000 karakter, ya."); return; }
    const crisis = crisisPattern.test(comment);
    setShowHelp(crisis);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await commentOnStory(story.id, comment);
        if (result.error) { setMessage(result.error); return; }
        setComment("");
        setMessage(result.moderated ? "Komentarmu diterima dan menunggu tinjauan dukungan/moderasi." : "Komentar suportifmu sudah terkirim 💜");
        router.refresh();
      } catch { setMessage("Komentar belum terkirim. Coba lagi sebentar, ya."); }
    });
  }
  return <article className="rounded-[36px] bg-white p-5 shadow-soft transition-[transform,box-shadow] duration-[250ms] ease-out motion-safe:[@media(hover:hover)]:hover:-translate-y-1 sm:p-8">
    <div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lilac text-xl">🦋</span><div><h3 className="text-sm font-semibold text-purple-800">{story.alias}</h3><p className="mt-1 text-[10px] text-muted">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${story.day}T00:00:00Z`))}</p></div></div>
    <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{story.body}</p>
    <div role="group" aria-label="Reaksi suportif" aria-busy={pending} className="mt-6 flex flex-wrap gap-2">{reactions.map(({ type, label, icon }) => <button key={type} type="button" disabled={pending} aria-pressed={story.mine[type]} onClick={() => react(type)} className={`btn !px-4 !py-2 text-xs disabled:opacity-60 ${story.mine[type] ? "btn-brand" : "btn-ghost"}`}><span aria-hidden="true">{icon}</span>{label} · {story.reactions[type]}</button>)}</div>
    <ReportButton id={story.id} type="story" />
    <details className="mt-5 border-t border-[#EADFF2] pt-4"><summary className="min-h-11 cursor-pointer text-sm font-medium text-purple-800">Komentar suportif</summary>
      <p className="mb-4 text-xs text-muted">Dengarkan tanpa menghakimi. Hindari diagnosis atau saran yang memaksa.</p>
      {commentError ? <p role="alert" className="text-sm text-muted">Komentar belum bisa dimuat.</p> : story.comments.length === 0 ? <p className="text-xs text-muted">Belum ada komentar. Sapa dengan hangat, yuk.</p> : <div className="space-y-3">{story.comments.map(item => <div key={item.id} className="rounded-[24px] bg-lilac/40 p-4"><p className="text-xs font-semibold text-purple-800">{item.alias}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{item.body}</p><ReportButton id={item.id} type="comment" /></div>)}</div>}
      {story.comments.length >= 5 && <p className="mt-3 text-xs text-muted">Menampilkan hingga 5 komentar terbaru.</p>}
      <form onSubmit={submitComment} className="mt-5"><label htmlFor={`comment-${story.id}`} className="text-xs font-medium">Tulis komentar suportif</label><textarea id={`comment-${story.id}`} value={comment} onChange={event => setComment(event.target.value)} required disabled={pending} maxLength={1000} rows={3} placeholder="Terima kasih sudah berbagi. Kamu tidak sendirian…" className={field} />{(showHelp || crisisPattern.test(comment)) && <HelpCard help={help} />}<button type="submit" disabled={pending} className="btn btn-ghost mt-3 text-xs disabled:opacity-60">{pending ? "Memproses…" : "Kirim dukungan →"}</button></form>
    </details>
    <p role="status" className="mt-3 text-sm text-purple-800">{message}</p>
  </article>;
}

export default function StoryRoom({ stories, help, loadError, commentError }: { stories: Story[]; help: CrisisHelp | null; loadError: boolean; commentError: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || body.trim().length > 5000) { setMessage("Tulis cerita maksimal 5.000 karakter, ya."); return; }
    setShowHelp(crisisPattern.test(body));
    setMessage("");
    startTransition(async () => {
      try {
        const result = await publishStory(body);
        if (result.error) { setMessage(result.error); return; }
        setBody("");
        setMessage(result.moderated ? "Ceritamu diterima dan menunggu tinjauan dukungan/moderasi. Terima kasih sudah bercerita." : "Ceritamu sudah dibagikan dengan nama samaran acak 💜");
        router.refresh();
      } catch { setMessage("Cerita belum terkirim. Coba lagi sebentar, ya."); }
    });
  }
  return <div className="mt-8"><form onSubmit={submit} aria-busy={pending} className="rounded-[36px] bg-white p-5 shadow-soft sm:p-8"><label htmlFor="story-body" className="text-xl font-medium">Apa yang ingin kamu ceritakan?</label><textarea id="story-body" required value={body} onChange={event => setBody(event.target.value)} maxLength={5000} rows={5} disabled={pending || loadError} placeholder="Mulai dari apa yang sedang ada di pikiranmu…" aria-describedby="story-limit" className={field} /><p id="story-limit" className="mt-2 text-right text-xs text-muted">{body.length}/5.000 karakter</p>{(showHelp || crisisPattern.test(body)) && <HelpCard help={help} />}<button type="submit" disabled={pending || loadError} className="btn btn-brand mt-4 disabled:opacity-60">{pending ? "Mengirim…" : "Bagikan cerita →"}</button><p role="status" className="mt-4 text-sm leading-relaxed text-purple-800">{message}</p></form><section aria-labelledby="feed-title" className="mt-10"><h2 id="feed-title" className="mb-5 text-xl font-medium">Cerita dari teman kita</h2>{loadError ? <p role="alert" className="rounded-2xl bg-peach p-5 text-sm">Ruang cerita belum bisa dimuat. Coba muat ulang sebentar lagi, ya.</p> : stories.length === 0 ? <p className="rounded-[36px] bg-lilac p-8 text-sm text-muted">Belum ada cerita yang tayang. Kamu boleh memulai dengan ceritamu.</p> : <div className="space-y-5">{stories.map(story => <StoryCard key={story.id} story={story} help={help} commentError={commentError} />)}</div>}<p className="mt-4 text-xs text-muted">Menampilkan hingga 30 cerita terbaru yang tayang.</p></section></div>;
}
