"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitExam } from "@/app/actions/student";
import { clock, fa } from "@/lib/format";

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
  const unanswered = questions.filter((candidate) => !isAnswered(candidate)).length;
  const lowTime = remaining !== null && remaining < 120;

  const finish = () => {
    const warning = unanswered > 0 ? `${fa(unanswered)} سوال بی‌پاسخ مانده است. آزمون را ثبت می‌کنید؟` : "آزمون را ثبت می‌کنید؟ بعد از ثبت، پاسخ‌ها قابل تغییر نیستند.";
    if (window.confirm(warning)) send(answers);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="display text-3xl text-marine">{title}</h1>
        <div
          className={`rounded-xl px-4 py-1.5 text-lg font-bold tabular-nums ${lowTime ? "bg-ember-soft text-[#a32a1f]" : "bg-white text-marine"}`}
          role="timer"
          aria-label="زمان باقی‌مانده"
        >
          {remaining === null ? "" : clock(remaining)}
        </div>
      </div>

      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="سوال‌ها">
        {questions.map((candidate, position) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => setIndex(position)}
            aria-current={position === index ? "step" : undefined}
            aria-label={`سوال ${position + 1}${isAnswered(candidate) ? "، پاسخ داده شده" : ""}`}
            className={`grid size-9 place-items-center rounded-lg text-sm font-bold ${
              position === index
                ? "bg-marine text-white"
                : isAnswered(candidate)
                  ? "bg-grass-2 text-marine"
                  : "bg-white text-ink-soft"
            }`}
          >
            {fa(position + 1)}
          </button>
        ))}
      </nav>

      <section className="sheet p-5 sm:p-8">
        <div className="mb-3 flex gap-2">
          <span className={question.kind === "mcq" ? "badge badge-azure" : "badge badge-sun"}>
            {question.kind === "mcq" ? "تستی" : "عملی"}
          </span>
          <span className="badge badge-quiet">{fa(question.points)} نمره</span>
        </div>
        <p className="whitespace-pre-wrap text-lg font-semibold" dir="auto">{fa(index + 1)}. {question.prompt}</p>

        {question.kind === "mcq" ? (
          <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="گزینه‌ها">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id]?.selected === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update(question.id, { selected: optionIndex })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                    selected ? "border-azure bg-[#e1eeff]" : "border-line bg-white hover:border-ink-soft"
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${selected ? "bg-azure text-white" : "bg-grass-0 text-ink-soft"}`}>
                    {"ABCD"[optionIndex]}
                  </span>
                  <bdi>{option}</bdi>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <label className="field-label" htmlFor={`answer-${question.id}`}>پاسخ شما (کد، توضیح یا لینک پروژه)</label>
            <textarea
              id={`answer-${question.id}`}
              dir="ltr"
              rows={12}
              spellCheck={false}
              value={answers[question.id]?.text ?? ""}
              onChange={(event) => update(question.id, { text: event.target.value })}
              className="input font-mono text-sm"
              style={{ textAlign: "left" }}
            />
          </div>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" className="btn btn-quiet" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          سوال قبلی
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setIndex(index + 1)}>سوال بعدی</button>
        ) : (
          <button type="button" className="btn btn-grass" disabled={isPending} onClick={finish}>
            {isPending ? "در حال ثبت…" : "ثبت آزمون"}
          </button>
        )}
      </div>
    </div>
  );
}
