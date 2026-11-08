"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { fa } from "@/lib/format";

function readDuration(file: File) {
  return new Promise<number>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}

export function VideoUploader({ courseId }: { courseId: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const upload = async (form: FormData) => {
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    if (!(file instanceof File) || file.size === 0) return setError("یک فایل ویدیو انتخاب کنید.");
    setError("");
    setDone("");
    setProgress(0);
    const duration = await readDuration(file);
    const query = new URLSearchParams({ courseId: String(courseId), title, duration: String(duration) });
    const request = new XMLHttpRequest();
    request.open("PUT", `/api/admin/videos/upload?${query}`);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => {
      setProgress(null);
      setError("ارتباط قطع شد. دوباره آپلود کنید.");
    };
    request.onload = () => {
      setProgress(null);
      if (request.status >= 200 && request.status < 300) {
        formRef.current?.reset();
        setDone(`«${title}» اضافه شد.`);
        router.refresh();
      } else {
        try {
          setError(JSON.parse(request.responseText).error);
        } catch {
          setError("آپلود انجام نشد. دوباره تلاش کنید.");
        }
      }
    };
    request.send(file);
  };

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        upload(new FormData(event.currentTarget));
      }}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div>
        <label className="field-label" htmlFor="video-title">عنوان ویدیو</label>
        <input id="video-title" name="title" required minLength={2} maxLength={150} className="input" />
      </div>
      <div>
        <label className="field-label" htmlFor="video-file">فایل MP4 یا WEBM</label>
        <input id="video-file" name="file" type="file" required accept="video/mp4,video/webm" className="input py-2.5 text-sm" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={progress !== null}>
        {progress === null ? "آپلود ویدیو" : `٪${fa(progress)}`}
      </button>
      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-grass-0 sm:col-span-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-grass-3 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-ember-soft px-3 py-2 text-sm font-medium text-[#a32a1f] sm:col-span-3">{error}</p>}
      {done && <p role="status" className="rounded-lg bg-[#dcf5e1] px-3 py-2 text-sm font-medium text-grass-4 sm:col-span-3">{done}</p>}
    </form>
  );
}
