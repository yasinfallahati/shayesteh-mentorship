"use client";

import { CheckIcon, CopyIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const send = (data: FormData) => startTransition(() => dispatch(data));
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(new FormData(event.currentTarget));
  };
  return { state, onSubmit, send, pending };
}

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const pending = useContext(FormPending);
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert" className="border-transparent bg-danger-soft text-danger">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertDescription className="text-danger">{message}</AlertDescription>
    </Alert>
  );
}

export function ActionForm({
  action,
  children,
  className = "grid gap-4",
  resetOnSuccess = false,
  confirm,
  confirmDetail,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  confirmDetail?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [awaiting, setAwaiting] = useState<FormData | null>(null);
  const { state, onSubmit, send, pending } = useFormAction(async (previous, form) => {
    const next = await action(previous, form);
    if (next.ok && resetOnSuccess) formRef.current?.reset();
    return next;
  });

  useEffect(() => {
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <FormPending.Provider value={pending}>
      {/* POST so a submit before hydration cannot put passwords in the URL. */}
      <form
        ref={formRef}
        method="post"
        className={className}
        onSubmit={(event) => {
          if (!confirm) return onSubmit(event);
          event.preventDefault();
          setAwaiting(new FormData(event.currentTarget));
        }}
      >
        {state.credentials ? (
          <Credentials {...state.credentials} />
        ) : (
          <>
            {children}
            <FormError message={state.error} />
          </>
        )}
      </form>
      {confirm && (
        <AlertDialog open={awaiting !== null} onOpenChange={(open) => !open && setAwaiting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm}</AlertDialogTitle>
              {confirmDetail && <AlertDialogDescription>{confirmDetail}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (awaiting) send(awaiting);
                  setAwaiting(null);
                }}
              >
                تایید
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </FormPending.Provider>
  );
}

export function Credentials({ username, password }: { username: string; password: string }) {
  return (
    <div className="rounded-lg border border-grass-2 bg-success-soft p-4">
      <p className="font-semibold">اطلاعات ورود را همین حالا برای هنرجو بفرستید.</p>
      <p className="text-sm text-muted-foreground">رمز عبور بعد از بستن این صفحه دیگر نمایش داده نمی‌شود.</p>
      <dl className="mt-3 grid gap-2">
        {[
          ["نام کاربری", username],
          ["رمز عبور", password],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-1.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex items-center gap-2">
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
  variant = "outline",
  size = "sm",
}: {
  value: string;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}) {
  const [status, setStatus] = useState<"idle" | "done" | "failed">("idle");
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        const copied = await writeClipboard(value).catch(() => false);
        setStatus(copied ? "done" : "failed");
        setTimeout(() => setStatus("idle"), 2000);
      }}
    >
      {status === "done" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      <span aria-live="polite">{status === "done" ? "کپی شد" : status === "failed" ? "کپی نشد" : label}</span>
    </Button>
  );
}
