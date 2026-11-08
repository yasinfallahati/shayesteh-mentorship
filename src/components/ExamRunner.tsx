"use client";

import { Loader2Icon, TimerIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitExam } from "@/app/actions/student";
import { StatusBadge } from "@/components/kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { clock, fa } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RunnerQuestion {
  id: number;
  kind: "mcq" | "practical";
  prompt: string;
  options: string[];
  points: number;
}

type Answers = Record<number, { selected?: number; text?: string }>;

export function ExamRunner({
  attemptId,
  deadline,
  title,
  questions,
}: {
  attemptId: number;
  deadline: number;
  title: string;
  questions: RunnerQuestion[];
}) {
  const storageKey = `exam-draft-${attemptId}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submitted = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const send = useCallback(
    (current: Answers) => {
      if (submitted.current) return;
      submitted.current = true;
      startTransition(async () => {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        await submitExam(
          attemptId,
          questions.map((question) => ({
            questionId: question.id,
            selected: current[question.id]?.selected ?? null,
            text: current[question.id]?.text ?? "",
          })),
        );
      });
    },
    [attemptId, questions, storageKey],
  );

  const latest = useRef(answers);
  latest.current = answers;

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) send(latest.current);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, send]);

  const update = (questionId: number, value: { selected?: number; text?: string }) => {
    setAnswers((previous) => {
      const next = { ...previous, [questionId]: { ...previous[questionId], ...value } };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isAnswered = (question: RunnerQuestion) =>
    question.kind === "mcq" ? answers[question.id]?.selected !== undefined : Boolean(answers[question.id]?.text?.trim());

  const question = questions[index];
  const answeredCount = questions.filter(isAnswered).length;
  const unanswered = questions.length - answeredCount;
  const lowTime = remaining !== null && remaining < 120;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl">{title}</h1>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-card px-3 py-1 font-semibold tabular-nums",
            lowTime && "border-transparent bg-danger-soft text-danger",
          )}
          role="timer"
          aria-label="زمان باقی‌مانده"
        >
          <TimerIcon className="size-4" aria-hidden="true" />
          {remaining === null ? "" : clock(remaining)}
        </div>
      </div>

      <Progress value={(answeredCount / questions.length) * 100} className="mb-4 h-1.5" aria-label="پیشرفت پاسخ‌دهی" />

      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="سوال‌ها">
        {questions.map((candidate, position) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => setIndex(position)}
            aria-current={position === index ? "step" : undefined}
            aria-label={`سوال ${position + 1}${isAnswered(candidate) ? "، پاسخ داده شده" : ""}`}
            className={cn(
              "grid size-8 place-items-center rounded-md border text-sm font-medium transition-colors",
              position === index
                ? "border-primary bg-primary text-primary-foreground"
                : isAnswered(candidate)
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {fa(position + 1)}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-1 sm:p-3">
          <div className="mb-3 flex gap-2">
            <StatusBadge tone={question.kind === "mcq" ? "info" : "warning"}>{question.kind === "mcq" ? "تستی" : "عملی"}</StatusBadge>
            <StatusBadge tone="neutral">{fa(question.points)} نمره</StatusBadge>
          </div>
          <p className="whitespace-pre-wrap text-lg font-semibold" dir="auto">{fa(index + 1)}. {question.prompt}</p>

          {question.kind === "mcq" ? (
            <div className="mt-5 grid gap-2" role="radiogroup" aria-label="گزینه‌ها">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id]?.selected === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update(question.id, { selected: optionIndex })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors",
                      selected ? "border-primary bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {"ABCD"[optionIndex]}
                    </span>
                    <bdi>{option}</bdi>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 grid gap-1.5">
              <Label htmlFor={`answer-${question.id}`}>پاسخ شما (کد، توضیح یا لینک پروژه)</Label>
              <Textarea
                id={`answer-${question.id}`}
                dir="ltr"
                rows={12}
                spellCheck={false}
                value={answers[question.id]?.text ?? ""}
                onChange={(event) => update(question.id, { text: event.target.value })}
                className="text-left font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>سوال قبلی</Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex(index + 1)}>سوال بعدی</Button>
        ) : (
          <Button disabled={isPending} onClick={() => setConfirming(true)}>
            {isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            ثبت آزمون
          </Button>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>آزمون را ثبت می‌کنید؟</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0 ? `${fa(unanswered)} سوال بی‌پاسخ مانده است. ` : ""}بعد از ثبت، پاسخ‌ها قابل تغییر نیستند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ادامه آزمون</AlertDialogCancel>
            <AlertDialogAction onClick={() => send(answers)}>ثبت نهایی</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
