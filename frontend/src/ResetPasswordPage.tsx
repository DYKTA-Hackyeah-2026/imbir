import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react"

import AuthLayout from "@/components/AuthLayout"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, errorMessage, resetPassword, validationDetails } from "@/lib/api"
import { cn } from "@/lib/utils"

type ResetErrors = {
  password?: string
  confirmPassword?: string
}

function validate(password: string, confirm: string): ResetErrors {
  const errors: ResetErrors = {}
  if (!password) {
    errors.password = "Wybierz hasło."
  } else if (password.length < 8 || password.length > 64) {
    errors.password = "Hasło musi mieć od 8 do 64 znaków."
  } else if (!/[a-z]/.test(password)) {
    errors.password = "Hasło musi zawierać małą literę."
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Hasło musi zawierać wielką literę."
  } else if (!/\d/.test(password)) {
    errors.password = "Hasło musi zawierać cyfrę."
  }
  if (!confirm) {
    errors.confirmPassword = "Potwierdź hasło."
  } else if (confirm !== password) {
    errors.confirmPassword = "Hasła nie są takie same."
  }
  return errors
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<ResetErrors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = "Nowe hasło · Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const nextErrors = validate(password, confirm)
    setErrors(nextErrors)
    if (nextErrors.password || nextErrors.confirmPassword) {
      document
        .getElementById(nextErrors.password ? "reset-password" : "reset-confirm")
        ?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError(
          "Ten link do resetowania jest nieprawidłowy lub wygasł. Poproś o nowy.",
        )
      } else {
        const details = validationDetails(error)
        const mapped: ResetErrors = {}
        for (const detail of details) {
          if (detail.path === "password") mapped.password = detail.message
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped)
        } else {
          setFormError(errorMessage(error))
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasToken = token.trim().length > 0

  return (
    <AuthLayout
      title={done ? "Hasło zmienione" : "Ustaw nowe hasło"}
      description={
        done ? undefined : "Ustaw nowe hasło do swojego konta."
      }
    >
      {done ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              aria-hidden="true"
              className="text-primary size-5 shrink-0"
            />
            <p className="font-semibold">Gotowe</p>
          </div>
          <p className="mt-2 text-sm text-balance text-slate-600 dark:text-neutral-400">
            Twoje hasło zostało zmienione, a wszystkie inne sesje zostały
            wylogowane. Możesz teraz zalogować się nowym hasłem.
          </p>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "mt-4 h-10 w-full",
            )}
          >
            Przejdź do logowania
          </Link>
        </div>
      ) : !hasToken ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 rounded-xl border p-4"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert
              aria-hidden="true"
              className="text-destructive size-5 shrink-0"
            />
            <p className="font-semibold">Brak tokenu resetowania</p>
          </div>
          <p className="mt-2 text-sm text-balance text-slate-600 dark:text-neutral-400">
            Otwórz tę stronę, korzystając z linku w wiadomości e-mail.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError ? (
            <p
              role="alert"
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
            >
              {formError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reset-password">Nowe hasło</Label>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={
                  errors.password
                    ? "reset-password-error"
                    : "reset-password-hint"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 pr-11 pl-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            </div>
            {errors.password ? (
              <p
                id="reset-password-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.password}
              </p>
            ) : (
              <p
                id="reset-password-hint"
                className="text-muted-foreground text-sm"
              >
                8–64 znaki, w tym wielka litera, mała litera i cyfra.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Potwierdź nowe hasło</Label>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                id="reset-confirm"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={
                  errors.confirmPassword ? "reset-confirm-error" : undefined
                }
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="h-10 pl-10"
              />
            </div>
            {errors.confirmPassword ? (
              <p
                id="reset-confirm-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="h-10 w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                Aktualizowanie…
              </>
            ) : (
              "Zmień hasło"
            )}
          </Button>
        </form>
      )}

      {!done ? (
        <p className="mt-5 text-center text-sm text-slate-600 dark:text-neutral-400">
          <Link
            to="/login"
            className="text-primary font-semibold underline-offset-4 hover:underline"
          >
            Powrót do logowania
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  )
}
