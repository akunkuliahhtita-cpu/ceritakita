"use client";
import { useState } from "react";
import DashboardIcon from "./DashboardIcon";

function Sparkline({ week }: { week: (number | null)[] }) {
  const point = (score: number, index: number) => ({ x: 8 + index * 15, y: 39 - (score - 1) * 8 });
  return <svg viewBox="0 0 106 48" className="dashboard-sparkline" role="img" aria-label="Pola mood tujuh hari; hari tanpa catatan tidak dihubungkan">{week.map((score, index) => {
    if (score === null) return null;
    const current = point(score, index); const previous = index > 0 ? week[index - 1] : null;
    return <g key={index}>{previous !== null && index > 0 && <line x1={point(previous, index - 1).x} y1={point(previous, index - 1).y} x2={current.x} y2={current.y} stroke="currentColor" strokeWidth="2" />}<circle cx={current.x} cy={current.y} r="2.5" fill="currentColor" /></g>;
  })}</svg>;
}
export default function DashboardStats({ streak, average, week, recordedDays, journalCount }: { streak: number | null; average: number | null; week: (number | null)[]; recordedDays: number; journalCount: number | null }) {
  const [selected, setSelected] = useState(1);
  return <div className="dashboard-stat-grid">
    <button type="button" aria-pressed={selected === 0} onClick={() => setSelected(0)} className={`dashboard-stat dashboard-lift stat-peach ${selected === 0 ? "is-selected" : ""}`}><span className="dashboard-stat-heading"><span className="dashboard-stat-icon"><DashboardIcon name="flame" /></span>Streak hari beruntun</span><span className="dashboard-stat-value">{streak ?? "—"}<small>{streak !== null ? "hari" : ""}</small></span><span className="dashboard-stat-note">{streak === null ? "Catatan belum bisa dimuat" : streak === 0 ? "Mulai dari satu catatan hari ini" : "Berdasarkan catatan moodmu"}</span></button>
    <button type="button" aria-pressed={selected === 1} onClick={() => setSelected(1)} className={`dashboard-stat dashboard-lift stat-blush ${selected === 1 ? "is-selected" : ""}`}><span className="dashboard-stat-heading"><span className="dashboard-stat-icon"><DashboardIcon name="mood" /></span>Rata-rata mood 7 hari</span><span className="flex items-center justify-between gap-2"><span className="dashboard-stat-value">{average === null ? "—" : average.toLocaleString("id-ID", { maximumFractionDigits: 1 })}<small>{average === null ? "" : "/ 5"}</small></span>{average !== null && <Sparkline week={week} />}</span><span className="dashboard-stat-note">{average === null ? "Belum ada mood yang bisa ditampilkan" : `Dari ${recordedDays} hari yang tercatat`}</span></button>
    <button type="button" aria-pressed={selected === 2} onClick={() => setSelected(2)} className={`dashboard-stat dashboard-lift stat-sage ${selected === 2 ? "is-selected" : ""}`}><span className="dashboard-stat-heading"><span className="dashboard-stat-icon"><DashboardIcon name="journal" /></span>Jurnal bulan ini</span><span className="dashboard-stat-value">{journalCount ?? "—"}<small>{journalCount !== null ? "catatan" : ""}</small></span><span className="dashboard-stat-note">{journalCount === null ? "Jurnal belum bisa dimuat" : journalCount === 0 ? "Halaman pertamamu menunggu" : "Ruang kecil untuk isi kepalamu"}</span></button>
  </div>;
}
