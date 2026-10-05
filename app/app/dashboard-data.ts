export function jakartaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function moodStatistics(entries: { day: string; score: number }[], today: string) {
  const valid = entries.filter(entry => entry.day <= today && Number.isInteger(entry.score) && entry.score >= 1 && entry.score <= 5);
  const scores = new Map(valid.map(entry => [entry.day, entry.score]));
  const week = Array.from({ length: 7 }, (_, index) => scores.get(shiftDay(today, index - 6)) ?? null);
  const filled = week.filter((score): score is number => score !== null);
  let cursor = scores.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (scores.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  return { week, streak, average: filled.length ? filled.reduce((sum, score) => sum + score, 0) / filled.length : null, recordedDays: filled.length, today: scores.get(today) ?? null };
}
