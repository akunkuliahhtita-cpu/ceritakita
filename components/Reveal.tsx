"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

type RevealProps = ComponentPropsWithoutRef<"section">;

export default function Reveal({ className = "", children, ...props }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState("idle");

  useEffect(() => {
    const element = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || motion.matches || !("IntersectionObserver" in window)) return;

    setState("pending");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setState("visible");
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(element);
    const stopMotion = () => {
      if (motion.matches) {
        setState("visible");
        observer.disconnect();
      }
    };
    motion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", stopMotion);
    };
  }, []);

  return <section ref={ref} className={`reveal ${className}`} data-reveal={state} {...props}>{children}</section>;
}
