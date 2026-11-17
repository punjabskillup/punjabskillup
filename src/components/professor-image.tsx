"use client";

import { useEffect, useRef, useState } from "react";

export function ProfessorImage() {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      if (image.naturalWidth > 0) {
        setLoaded(true);
      } else {
        setFailed(true);
      }
    }

    const hero = image?.closest(".hero-section");
    if (!hero || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (failed) {
    return null;
  }

  return (
    <div
      className={`professor-visual${loaded ? " is-loaded" : ""}${inView ? " is-in-view" : ""}`}
      aria-hidden="true"
    >
      <picture className="professor-picture">
        <source
          media="(min-width: 768px)"
          srcSet="/professor/hero-professor-desktop.webp"
          width={664}
          height={840}
        />
        <img
          ref={imageRef}
          className="professor-image"
          src="/professor/hero-professor-mobile.webp"
          width={490}
          height={620}
          data-loaded={loaded}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </picture>
      <div className="shine" aria-hidden="true" />
    </div>
  );
}
