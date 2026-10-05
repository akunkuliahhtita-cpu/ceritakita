import Sponsored from "@/components/Sponsored";
import Image from "next/image";
import Link from "next/link";
import QuickMood from "@/components/QuickMood";
import DashboardStats from "@/components/DashboardStats";
import DashboardIcon from "@/components/DashboardIcon";
import { dashboardContext } from "./dashboard-context";
import { jakartaDay, moodStatistics } from "./dashboard-data";

export default async function Dashboard() {
  const { supabase, user, name } = await dashboardContext();
  const now = new Date(); const today = jakartaDay(now);
  const monthStart = `${today.slice(0, 7)}-01T00:00:00+07:00`;
  const nextMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1) - 7 * 60 * 60 * 1000).toISOString();
  const [moodResult, journalCountResult, journalResult, storyResult, articleResult, videoResult] = await Promise.all([
    supabase.from("mood_entries").select("day,score").eq("user_id", user.id).lte("day", today).order("day", { ascending: false }),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", monthStart).lt("created_at", nextMonth),
    supabase.from("journal_entries").select("id,title,content,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("story_feed").select("id,alias,body").limit(3),
    supabase.from("articles").select("id,title,excerpt,published_at").eq("status", "published").lte("published_at", now.toISOString()).order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("videos").select("id,title,published_at").eq("status", "published").lte("published_at", now.toISOString()).order("published_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const moods = (moodResult.error ? [] : moodResult.data ?? []).map(entry => ({ day: String(entry.day), score: Number(entry.score) }));
  const stats = moodStatistics(moods, today);
  const journal = journalResult.data;
  const journalToday = journal && typeof journal.created_at === "string" ? jakartaDay(new Date(journal.created_at)) === today : false;
  const article = articleResult.data; const video = videoResult.data;
  const education = article && (!video || article.published_at >= video.published_at) ? { title: article.title, excerpt: article.excerpt, kind: "Bacaan pilihan" } : video ? { title: video.title, excerpt: "Luangkan waktu untuk video pilihan ini, sesuai ritmemu.", kind: "Video pilihan" } : null;
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);
  return <div className="dashboard-home">
    <section className="dashboard-welcome"><div className="dashboard-welcome-copy"><p className="dashboard-date">{dateLabel}</p><p className="dashboard-welcome-eyebrow">SENANG KAMU ADA DI SINI</p><h1>Halo, {name}!</h1><p className="dashboard-welcome-message">Tidak harus selalu baik-baik saja.<br />Hari ini, beri sedikit ruang untuk dirimu.</p><Link href="#mood-check-in" className="btn dashboard-banner-button">Apa kabarmu hari ini? <DashboardIcon name="arrow" /></Link></div><div aria-hidden="true" className="dashboard-welcome-orbit" /><div className="dashboard-welcome-art"><Image src="/images/meditasi.jpg" alt="Ilustrasi waktu tenang untuk diri sendiri" fill priority sizes="(min-width: 1024px) 340px, (min-width: 640px) 240px, 150px" className="object-cover" /></div><span aria-hidden="true" className="dashboard-welcome-spark">✦</span></section>
    <DashboardStats streak={moodResult.error ? null : stats.streak} average={stats.average} week={stats.week} recordedDays={stats.recordedDays} journalCount={journalCountResult.error ? null : journalCountResult.count} />
    <div className="dashboard-content-grid"><div className="dashboard-primary"><div id="mood-check-in">{moodResult.error && <p role="alert" className="mb-3 text-xs text-muted">Mood sebelumnya belum bisa dimuat.</p>}<QuickMood initialScore={stats.today} /></div>
      <section className="dashboard-continue"><div className="dashboard-section-heading"><h2>Lanjutkan perjalananmu</h2><span>Selangkah demi selangkah</span></div><div className="dashboard-continue-grid">
        <article className="dashboard-continue-card dashboard-lift continue-peach"><div className="dashboard-continue-visual"><Image src="/images/laptop.jpg" alt="" fill sizes="150px" className="object-cover" /><span aria-hidden="true" className="dashboard-continue-symbol"><DashboardIcon name="journal" /></span></div><div className="dashboard-continue-copy"><p className="dashboard-card-eyebrow">JURNAL TERAKHIR</p><h3>{journalResult.error ? "Jurnal belum bisa dimuat" : journal ? journal.title || "Catatan untuk diri" : "Mulai dari satu kalimat"}</h3><p>{journalResult.error ? "Coba buka halaman jurnal lagi, ya." : journal ? String(journal.content ?? "").slice(0, 95) : "Belum ada jurnal. Apa yang ingin kamu ingat dari hari ini?"}</p><Link href={journal ? `/app/jurnal#journal-${journal.id}` : "/app/jurnal"} className="btn btn-ghost">Buka <DashboardIcon name="arrow" /></Link></div></article>
        <article className="dashboard-continue-card dashboard-lift continue-lilac"><div className="dashboard-continue-visual"><Image src="/images/meditasi.jpg" alt="" fill sizes="150px" className="object-cover" /><span aria-hidden="true" className="dashboard-continue-symbol"><DashboardIcon name="education" /></span></div><div className="dashboard-continue-copy"><p className="dashboard-card-eyebrow">{education ? education.kind.toLocaleUpperCase("id-ID") : "EDUKASI PILIHAN"}</p><h3>{education ? education.title : "Ruang untuk belajar"}</h3><p>{education ? education.excerpt : articleResult.error || videoResult.error ? "Konten belum bisa dimuat. Coba lagi sebentar, ya." : "Konten pilihan akan hadir di sini saat sudah tersedia."}</p><Link href="/app/edukasi" className="btn btn-ghost">Buka <DashboardIcon name="arrow" /></Link></div></article>
      </div></section>
    </div><aside className="dashboard-right-column">
      <section className="dashboard-community"><div className="dashboard-section-heading"><h2>Cerita terbaru</h2><Link href="/app/cerita">Lihat semua ↗</Link></div><p className="dashboard-small-intro">Kadang, kita merasa lebih ringan saat tahu kita tidak sendirian.</p>{storyResult.error ? <p className="dashboard-empty">Cerita belum bisa dimuat. Coba lagi sebentar, ya.</p> : !storyResult.data?.length ? <div className="dashboard-empty"><DashboardIcon name="story" /><p>Belum ada cerita yang tayang. Ada ruang untuk ceritamu di sini.</p><Link href="/app/cerita">Mulai bercerita →</Link></div> : <div className="dashboard-story-list">{storyResult.data.map((story, index) => <Link key={story.id} href="/app/cerita" className="dashboard-story"><span aria-hidden="true" className={`dashboard-story-avatar story-tint-${index}`}><DashboardIcon name="story" /></span><span><strong>{story.alias}</strong><span>{String(story.body).slice(0, 125)}</span></span></Link>)}</div>}</section>
      <section className="dashboard-reminders"><div className="dashboard-section-heading"><h2>Pengingat harian</h2><span aria-hidden="true">☀</span></div><p className="dashboard-small-intro">Dua jeda kecil, hanya untukmu.</p><Link href="/app/mood" className="dashboard-reminder"><span className={`dashboard-reminder-check ${stats.today !== null ? "is-done" : ""}`}>{stats.today !== null && <DashboardIcon name="check" />}</span><span><strong>Menyapa perasaanmu</strong><small>{moodResult.error ? "Status mood belum tersedia" : stats.today !== null ? "Mood hari ini sudah tercatat" : "Bagaimana kabarmu hari ini?"}</small></span></Link><Link href="/app/jurnal" className="dashboard-reminder"><span className={`dashboard-reminder-check ${journalToday ? "is-done" : ""}`}>{journalToday && <DashboardIcon name="check" />}</span><span><strong>Memberi ruang lewat tulisan</strong><small>{journalResult.error ? "Status jurnal belum tersedia" : journalToday ? "Jurnal hari ini sudah kamu tulis" : "Satu kalimat pun cukup"}</small></span></Link><p className="dashboard-reminder-footer">Tidak harus selesai semua.<br />Ritmemu tetap berharga.</p></section>
    </aside></div>
    <Sponsored placement="dashboard"/>
  </div>;
}
