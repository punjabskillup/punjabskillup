"use client";

import { useEffect, useState } from "react";
import { getYouTubeVideoId } from "@/lib/courses";

type VideoPlayerProps = {
  lectureId: string;
  videoProvider: string;
  videoRef: string;
  title: string;
};

export function VideoPlayer({
  lectureId,
  videoProvider,
  videoRef,
  title,
}: VideoPlayerProps) {
  const [bunnyResult, setBunnyResult] = useState<{
    lectureId: string;
    url?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (videoProvider !== "bunny") {
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/videos/${encodeURIComponent(lectureId)}/token`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result: { url?: string; error?: string } = await response.json();
        if (!response.ok || !result.url) {
          throw new Error(result.error ?? "Unable to load this video.");
        }
        setBunnyResult({ lectureId, url: result.url });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setBunnyResult({
          lectureId,
          error: error instanceof Error ? error.message : "Unable to load this video.",
        });
      });

    return () => controller.abort();
  }, [lectureId, videoProvider]);

  if (videoProvider === "bunny") {
    const currentBunnyResult =
      bunnyResult?.lectureId === lectureId ? bunnyResult : null;
    if (currentBunnyResult?.error) {
      return <div className="video-unavailable" role="alert">{currentBunnyResult.error}</div>;
    }
    if (!currentBunnyResult?.url) {
      return <div className="video-unavailable" role="status">Preparing your secure video...</div>;
    }

    return (
      <div className="video-frame">
        <iframe
          src={currentBunnyResult.url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoProvider !== "youtube") {
    return (
      <div className="video-unavailable" role="status">
        This lecture&apos;s video provider is not supported.
      </div>
    );
  }

  const videoId = getYouTubeVideoId(videoRef);

  if (!videoId) {
    return (
      <div className="video-unavailable" role="status">
        This lecture&apos;s YouTube video is unavailable. Please contact the instructor.
      </div>
    );
  }

  return (
    <div className="video-frame">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
