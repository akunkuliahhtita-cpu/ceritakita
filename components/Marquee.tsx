"use client";

import { useState, type CSSProperties } from "react";

type Review = { name: string; text: string; tag: string; rating: number };

function ReviewCard({ review, index }: { review: Review; index: number }) {
  return (
    <article className="review-card relative flex min-h-52 w-64 shrink-0 flex-col rounded-[30px] bg-white p-6 sm:w-72" style={{ "--review-tilt": `${index % 3 === 0 ? -5 : index % 3 === 1 ? 3 : -2}deg` } as CSSProperties}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`grid h-11 w-11 place-items-center rounded-full text-lg text-purple-800 ${index % 2 ? "bg-peach" : "bg-blush"}`}>{review.name.slice(0, 1)}</span>
        <div><p className="text-sm font-medium">{review.name}</p><p aria-label={`${review.rating} dari 5 bintang`} className="mt-1 text-xs tracking-widest text-purple-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p></div>
      </div>
      <p className="my-4 text-sm leading-relaxed text-muted">“{review.text}”</p>
      <span className="mt-auto w-fit rounded-full bg-sage px-3 py-1.5 text-[10px]">{review.tag}</span>
      <span aria-hidden="true" className="absolute bottom-3 right-5 text-5xl leading-none text-lilac">”</span>
    </article>
  );
}

export default function Marquee({ items, dir }: { items: Review[]; dir: "l" | "r" }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="group relative">
      <div className="mq overflow-x-auto py-5 motion-reduce:overflow-x-auto" onTouchStart={() => setPaused(true)}>
        <div className={`track ${dir} focus-within:[animation-play-state:paused]`} style={paused ? { animationPlayState: "paused" } : undefined}>
          {[0, 1].map((copy) => <div key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 gap-4">{items.map((review, index) => <ReviewCard key={review.name} review={review} index={index} />)}</div>)}
        </div>
      </div>
      <div className="flex justify-center"><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} className="min-h-11 rounded-full px-4 text-xs text-purple-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 motion-reduce:hidden">{paused ? "Lanjutkan ulasan →" : "Jeda ulasan Ⅱ"}</button></div>
    </div>
  );
}
