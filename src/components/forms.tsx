"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ActionState } from "@/lib/forms";

type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;

export const FormPending = createContext(false);

/**
 * React clears a form after a function passed to its action prop finishes,
 * which would wipe what the person typed whenever validation fails. Dispatching
 * from onSubmit keeps the values.
 */
export function useFormAction(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, {});
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, onSubmit, pending };
}

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel = "در حال انجام…",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const pending = useContext(FormPending);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-ember-soft px-3 py-2 text-sm font-medium text-[#a32a1f]">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg bg-[#dcf5e1] px-3 py-2 text-sm font-medium text-grass-4">
        {state.message}
      </p>
    );
  }
  return null;
}

export function ActionForm({
  action,
  children,
  className = "space-y-4",
  resetOnSuccess = false,
  confirm,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(async (previous, form) => {
    const next = await action(previous, form);
    if (next.ok && resetOnSuccess) formRef.current?.reset();
    return next;
  });
  return (
    <FormPending.Provider value={pending}>
      <form
        ref={formRef}
        className={className}
        onSubmit={(event) => {
          if (confirm && !window.confirm(confirm)) {
            event.preventDefault();
            return;
          }
          onSubmit(event);
        }}
      >
        {children}
        <FormMessage state={state} />
        {state.credentials && <Credentials {...state.credentials} />}
      </form>
    </FormPending.Provider>
  );
}

export function Credentials({ username, password }: { username: string; password: string }) {
  return (
    <div className="rounded-xl border-2 border-grass-2 bg-[#effbf1] p-4">
      <p className="font-semibold">اطلاعات ورود را همین حالا برای هنرجو بفرستید.</p>
      <p className="mt-0.5 text-sm text-ink-soft">رمز عبور بعد از بستن این صفحه دیگر نمایش داده نمی‌شود.</p>
      <dl className="mt-3 space-y-2">
        {[
          ["نام کاربری", username],
          ["رمز عبور", password],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="flex items-center gap-3">
              <code dir="ltr" className="font-semibold">{value}</code>
              <CopyButton value={value} label={`کپی ${label}`} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

async function writeClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

export function CopyButton({
  value,
  label = "کپی",
  className = "btn btn-quiet btn-sm",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const copied = await writeClipboard(value).catch(() => false);
        setStatus(copied ? "done" : "failed");
        setTimeout(() => setStatus("idle"), 2000);
      }}
    >
      <span aria-live="polite">
        {status === "done" ? "کپی شد" : status === "failed" ? "کپی نشد" : label}
      </span>
    </button>
  );
}
