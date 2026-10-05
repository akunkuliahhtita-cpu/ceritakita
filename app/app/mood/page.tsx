import DailyMoodForm from "@/components/DailyMoodForm";
import { authenticatedClient } from "@/lib/supabase-server";

export default async function MoodPage() {
  const { supabase, user } = await authenticatedClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return { day: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(date) };
  });
  const { data, error } = await supabase.from("mood_entries").select("day,score,emotions,note").eq("user_id", user.id).gte("day", days[0].day).lte("day", today).order("day");
  const entries = data ?? [];
  const current = entries.find(entry => entry.day === today);
  const initial = {
    score: typeof current?.score === "number" ? current.score : null,
    emotions: Array.isArray(current?.emotions) ? current.emotions.filter((tag: unknown): tag is string => typeof tag === "string") : [],
    note: typeof current?.note === "string" ? current.note : "",
  };

  return <>
    <p className="text-xs tracking-[.15em] text-purple-800">KENALI PERASAANMU</p>
    <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Mood harian</h1>
    <p className="mt-3 text-sm text-muted">Semua rasa punya tempat. Catatan mood ini hanya untukmu.</p>
    {error && <p role="alert" className="mt-5 rounded-2xl bg-peach p-4 text-sm">Catatan mood belum bisa dimuat. Muat ulang halaman sebelum mengubah catatan hari ini.</p>}
    {!error && <DailyMoodForm key={`${today}:${current?.score ?? "empty"}:${current?.note ?? ""}:${initial.emotions.join(",")}`} initial={initial} />}
    <section aria-labelledby="chart-title" className="mt-8 rounded-[36px] bg-white p-5 shadow-soft sm:p-8">
      <h2 id="chart-title" className="text-xl font-medium">Perasaanmu selama 7 hari</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">Skala 1 (berat) sampai 5 (senang). Tanda — berarti belum ada catatan.</p>
      {error ? <p className="mt-5 text-sm text-muted">Grafik belum bisa dimuat.</p> : <>
        <div className="mt-7 flex items-end gap-2 sm:gap-4" aria-label="Grafik mood tujuh hari">
          {days.map(({ day, label }) => {
            const entry = entries.find(item => item.day === day);
            const score = typeof entry?.score === "number" && entry.score >= 1 && entry.score <= 5 ? entry.score : null;
            return <div key={day} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-sm font-semibold text-purple-800">{score ?? "—"}</span><div aria-hidden="true" className="relative flex h-40 w-full max-w-12 items-end overflow-hidden rounded-xl bg-lilac/40"><div className="w-full rounded-t-xl" style={{ height: score === null ? "0%" : `${score * 20}%`, background: "var(--grad-brand)" }} /></div><span className="text-center text-[10px] text-muted sm:text-xs">{label}</span><span className="sr-only">{score === null ? "Belum ada catatan" : `Mood ${score} dari 5`}</span></div>;
          })}
        </div>
        {entries.length === 0 && <p className="mt-5 text-sm text-muted">Belum ada catatan minggu ini. Mulai dengan mood hari ini, yuk.</p>}
      </>}
    </section>
  </>;
}
