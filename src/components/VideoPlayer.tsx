"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ring } from "@/components/kit";
import { fa } from "@/lib/format";

const BUCKETS = 100;
const FLUSH_MS = 10_000;

export function VideoPlayer({
  videoId,
  lastPosition,
  initialPercent,
  initialCompleted,
}: {
  videoId: number;
  lastPosition: number;
  initialPercent: number;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pending = useRef(new Set<number>());
  const unsentSeconds = useRef(0);
  const previousTime = useRef(0);
  const [percent, setPercent] = useState(initialPercent);
  const [completed, setCompleted] = useState(initialCompleted);

  const flush = useCallback(
    (keepalive = false) => {
      const video = videoRef.current;
      if (!video || (pending.current.size === 0 && unsentSeconds.current < 1)) return;
      const payload = {
        buckets: [...pending.current],
        position: video.currentTime,
        seconds: unsentSeconds.current,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      };
      pending.current.clear();
      unsentSeconds.current = 0;
      fetch(`/api/videos/${videoId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((result) => {
          if (!result) return;
          setPercent(result.percent);
          setCompleted(result.completed);
          if (result.justCompleted) router.refresh();
        })
        .catch(() => {});
    },
    [videoId, router],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) flush();
    }, FLUSH_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      flush(true);
    };
  }, [flush]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const now = video.currentTime;
    const before = previousTime.current;
    previousTime.current = now;
    // Only continuous playback counts, so dragging to the end earns nothing.
    if (video.seeking || now <= before || now - before > 2.5) return;
    unsentSeconds.current += now - before;
    const first = Math.floor((before / video.duration) * BUCKETS);
    const last = Math.min(BUCKETS - 1, Math.floor((now / video.duration) * BUCKETS));
    for (let bucket = first; bucket <= last; bucket += 1) pending.current.add(bucket);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-pine" dir="ltr">
        <video
          ref={videoRef}
          src={`/api/videos/${videoId}/stream`}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          playsInline
          preload="metadata"
          className="aspect-video w-full"
          onContextMenu={(event) => event.preventDefault()}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (lastPosition > 3 && lastPosition < video.duration - 5) video.currentTime = lastPosition;
            previousTime.current = video.currentTime;
          }}
          onTimeUpdate={onTimeUpdate}
          onSeeked={(event) => {
            previousTime.current = event.currentTarget.currentTime;
          }}
          onPause={() => flush()}
          onEnded={() => flush()}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Ring value={percent} size={52} stroke={5} label={`${percent} درصد از این ویدیو دیده شده`}>
          <span className="text-xs font-semibold">٪{fa(percent)}</span>
        </Ring>
        {completed ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2Icon className="size-4" aria-hidden="true" /> این ویدیو را کامل دیده‌اید
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">با دیدن ٪{fa(90)} از ویدیو، کامل حساب می‌شود.</p>
        )}
      </div>
    </div>
  );
}
