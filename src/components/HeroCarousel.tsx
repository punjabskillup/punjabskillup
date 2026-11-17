"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { SignInTrigger } from "@/components/navbar";

type Slide = {
  label: string;
  before: string;
  accent: string;
  text: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    label: "PUNJABSKILLUP",
    before: "Learn skills that ",
    accent: "matter",
    text: "Practical video courses from experienced instructors, at your own pace.",
    cta: "Explore courses",
  },
  {
    label: "AI STUDY HELPER",
    before: "Ask your lecture ",
    accent: "anything",
    text: "Get summaries, answers and quizzes from your instructor's own lectures.",
    cta: "Explore courses",
  },
  {
    label: "START FREE",
    before: "Start free, then ",
    accent: "level up",
    text: "Begin with free lectures and notes, then move to paid courses when you are ready.",
    cta: "Join free",
  },
];

const DURATION = 325;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const AUTOPLAY_MS = 3000;
type Direction = 1 | -1;
type TransitionStyle = "push" | "cover" | "fade";
const STYLE: TransitionStyle = "push";

function frames(
  style: TransitionStyle,
  direction: Direction,
): { enter: Keyframe[]; leave: Keyframe[] } {
  if (style === "fade") {
    return {
      enter: [{ opacity: 0 }, { opacity: 1 }],
      leave: [{ opacity: 1 }, { opacity: 0 }],
    };
  }

  const enter: Keyframe[] = [
    { transform: `translateX(${direction * 100}%)` },
    { transform: "translateX(0)" },
  ];
  if (style === "cover") {
    return {
      enter,
      leave: [
        { transform: "translateX(0)", opacity: 1 },
        { transform: `translateX(${-direction * 28}%)`, opacity: 0.55 },
      ],
    };
  }

  return {
    enter,
    leave: [
      { transform: "translateX(0)" },
      { transform: `translateX(${-direction * 100}%)` },
    ],
  };
}

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const [started, setStarted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hold, setHold] = useState({
    hover: false,
    focus: false,
    touch: false,
    hidden: false,
    away: false,
  });

  const rootRef = useRef<HTMLElement>(null);
  const slideEls = useRef<(HTMLElement | null)[]>([]);
  const pending = useRef<{ from: number; to: number; direction: Direction } | null>(
    null,
  );
  const animations = useRef<Animation[]>([]);
  const busy = useRef(false);
  const startX = useRef<{ pointerId: number; x: number } | null>(null);
  const reduced = useRef(false);
  const wasPaused = useRef(false);

  const paused =
    reducedMotion ||
    hold.hover ||
    hold.focus ||
    hold.touch ||
    hold.hidden ||
    hold.away;

  const setH = useCallback(
    (key: keyof typeof hold, value: boolean) => {
      setHold((current) =>
        current[key] === value ? current : { ...current, [key]: value },
      );
    },
    [],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => {
      const shouldReduce = mediaQuery.matches;
      reduced.current = shouldReduce;
      setReducedMotion(shouldReduce);
      if (shouldReduce && animations.current.length) {
        animations.current.forEach((animation) => animation.cancel());
        animations.current = [];
        busy.current = false;
        setLeaving(null);
      }
    };

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setH("away", !entry.isIntersecting || entry.intersectionRatio < 0.35);
      },
      { threshold: 0.35 },
    );
    const updateVisibility = () => setH("hidden", document.hidden);

    observer.observe(element);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [setH]);

  const goTo = useCallback(
    (to: number, direction?: Direction) => {
      const target = ((to % SLIDES.length) + SLIDES.length) % SLIDES.length;
      if (busy.current || target === index) {
        return;
      }

      const transitionDirection = direction ?? (to > index ? 1 : -1);
      setStarted(true);
      setCycle((current) => current + 1);
      if (reduced.current) {
        setIndex(target);
        return;
      }

      busy.current = true;
      pending.current = { from: index, to: target, direction: transitionDirection };
      setLeaving(index);
      setIndex(target);
    },
    [index],
  );

  useLayoutEffect(() => {
    const transition = pending.current;
    if (!transition) {
      return;
    }
    pending.current = null;

    const from = slideEls.current[transition.from];
    const to = slideEls.current[transition.to];
    if (!from || !to) {
      busy.current = false;
      setLeaving(null);
      return;
    }

    const keyframes = frames(STYLE, transition.direction);
    const options: KeyframeAnimationOptions = {
      duration: DURATION,
      easing: EASE,
      fill: "both",
    };
    const enter = to.animate(keyframes.enter, options);
    const leave = from.animate(keyframes.leave, options);
    animations.current = [enter, leave];

    const finish = () => {
      if (animations.current[0] !== enter) {
        return;
      }

      enter.cancel();
      leave.cancel();
      animations.current = [];
      busy.current = false;
      setLeaving(null);
    };

    Promise.all([enter.finished, leave.finished]).then(finish, finish);
  }, [index]);

  useEffect(() => {
    if (wasPaused.current && !paused) {
      setCycle((current) => current + 1);
    }
    wasPaused.current = paused;
  }, [paused]);

  useEffect(() => {
    if (paused || reduced.current) {
      return;
    }

    const timeout = window.setTimeout(
      () => goTo(index + 1, 1),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [index, cycle, paused, goTo]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) {
      return;
    }

    event.preventDefault();
    const target = (index + direction + SLIDES.length) % SLIDES.length;
    goTo(index + direction, direction);
    if (
      event.target instanceof HTMLElement &&
      event.target.getAttribute("role") === "tab"
    ) {
      rootRef.current
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        [target]?.focus();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    startX.current = { pointerId: event.pointerId, x: event.clientX };
    setH("touch", true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = startX.current;
    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    startX.current = null;
    setH("touch", false);
    const distance = event.clientX - start.x;
    if (Math.abs(distance) >= 40) {
      const direction: Direction = distance < 0 ? 1 : -1;
      goTo(index + direction, direction);
    }
  }

  return (
    <section
      ref={rootRef}
      className="deck"
      data-started={started || undefined}
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
      aria-live={paused ? "polite" : "off"}
      onMouseEnter={() => setH("hover", true)}
      onMouseLeave={() => setH("hover", false)}
      onFocus={(event) => {
        setH(
          "focus",
          event.target instanceof HTMLElement &&
            event.target.matches(":focus-visible"),
        );
      }}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setH("focus", false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="deck-viewport"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          startX.current = null;
          setH("touch", false);
        }}
      >
        {SLIDES.map((slide, slideIndex) => {
          const state =
            slideIndex === index
              ? "active"
              : slideIndex === leaving
                ? "leaving"
                : "idle";
          const Heading = slideIndex === 0 ? "h1" : "h2";

          return (
            <article
              key={slide.label}
              ref={(element) => {
                slideEls.current[slideIndex] = element;
              }}
              id={`deck-slide-${slideIndex + 1}`}
              className="deck-slide"
              data-state={state}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${SLIDES.length}`}
              aria-hidden={state !== "active"}
              inert={state !== "active"}
            >
              <p className="deck-label deck-in">{slide.label}</p>
              <Heading className="deck-title deck-in">
                {slide.before}
                <span>{slide.accent}</span>
              </Heading>
              <p className="deck-text deck-in">{slide.text}</p>
              <SignInTrigger className="deck-cta deck-in">
                {slide.cta}
              </SignInTrigger>
            </article>
          );
        })}
        <div className="deck-count" aria-hidden="true">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(SLIDES.length).padStart(2, "0")}
        </div>
      </div>

      <div className="deck-dots" role="tablist" aria-label="Choose slide">
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.label}
            id={`deck-slide-tab-${slideIndex + 1}`}
            type="button"
            role="tab"
            aria-selected={slideIndex === index}
            aria-label={`Slide ${slideIndex + 1} of ${SLIDES.length}`}
            aria-controls={`deck-slide-${slideIndex + 1}`}
            className="deck-dot"
            data-active={slideIndex === index || undefined}
            tabIndex={slideIndex === index ? 0 : -1}
            onClick={() => goTo(slideIndex)}
          >
            <span className="deck-pill">
              {slideIndex === index && (
                <span
                  key={`${index}-${cycle}`}
                  className="deck-fill"
                  style={{
                    animationDuration: `${AUTOPLAY_MS}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
