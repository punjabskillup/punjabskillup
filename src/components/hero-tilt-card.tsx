"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";

type HeroTiltCardProps = {
  children: ReactNode;
  className: string;
  href?: string;
  label?: string;
};

export function HeroTiltCard({
  children,
  className,
  href,
  label,
}: HeroTiltCardProps) {
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const rotateY = Math.max(-8, Math.min(8, (x - 0.5) * 16));
    const rotateX = Math.max(-8, Math.min(8, (0.5 - y) * 16));

    if (returnTimer.current) clearTimeout(returnTimer.current);
    card.classList.remove("is-returning");
    card.classList.add("is-tilting");
    card.style.transition = "transform 90ms ease-out";
    card.style.transform = `perspective(900px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    card.style.setProperty("--mx", `${x * 100}%`);
    card.style.setProperty("--my", `${y * 100}%`);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const card = event.currentTarget;
    card.classList.add("is-returning");
    card.style.transition = "transform 500ms cubic-bezier(0.2, 0.75, 0.25, 1)";
    card.style.transform = "var(--t)";

    returnTimer.current = setTimeout(() => {
      card.classList.remove("is-tilting", "is-returning");
      card.style.removeProperty("transform");
      card.style.removeProperty("transition");
      returnTimer.current = null;
    }, 500);
  }

  return (
    <div
      className={`glass-card hero-bento-card tl ${className}`}
      onPointerEnter={handlePointerMove}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
      {href && label ? (
        <Link className="hero-topic-link" href={href} aria-label={label} />
      ) : null}
    </div>
  );
}
