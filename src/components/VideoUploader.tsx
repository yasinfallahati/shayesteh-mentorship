"use client";

import { UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms";
import { Field } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
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

export function VideoUploader({ courses }: { courses: { id: number; title: string }[] }) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const upload = async (form: FormData) => {
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const courseId = String(form.get("course_id") ?? "");
    if (!courseId) return setError("زبان این ویدیو را انتخاب کنید.");
    if (!(file instanceof File) || file.size === 0) return setError("یک فایل ویدیو انتخاب کنید.");
    setError("");
    setProgress(0);
    const duration = await readDuration(file);
    const query = new URLSearchParams({ courseId, title, duration: String(duration) });
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
        // The language stays selected so a series can be uploaded in a row.
        if (titleRef.current) titleRef.current.value = "";
        if (fileRef.current) fileRef.current.value = "";
        toast.success(`«${title}» اضافه شد.`);
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
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        upload(new FormData(event.currentTarget));
      }}
      className="grid gap-3 md:grid-cols-[1fr_1.3fr_1.3fr_auto] md:items-end"
    >
      <Field id="video-course" label="زبان">
        <NativeSelect id="video-course" name="course_id" required defaultValue="" className="w-full">
          <NativeSelectOption value="" disabled>انتخاب کنید</NativeSelectOption>
          {courses.map((course) => <NativeSelectOption key={course.id} value={course.id}>{course.title}</NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <Field id="video-title" label="عنوان ویدیو">
        <Input ref={titleRef} id="video-title" name="title" required minLength={2} maxLength={150} />
      </Field>
      <Field id="video-file" label="فایل MP4 یا WEBM">
        <Input ref={fileRef} id="video-file" name="file" type="file" required accept="video/mp4,video/webm" />
      </Field>
      <Button type="submit" disabled={progress !== null}>
        <UploadIcon aria-hidden="true" />
        {progress === null ? "آپلود ویدیو" : `٪${fa(progress)}`}
      </Button>
      {progress !== null && <Progress value={progress} className="h-1.5 md:col-span-4" aria-label="پیشرفت آپلود" />}
      {error && <div className="md:col-span-4"><FormError message={error} /></div>}
    </form>
  );
}
