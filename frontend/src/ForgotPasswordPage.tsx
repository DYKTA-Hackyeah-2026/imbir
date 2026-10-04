import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Loader2, Mail } from "lucide-react"

import AuthLayout from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage, forgotPassword } from "@/lib/api"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    document.title = "Resetowanie hasła · Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = email.trim()

    if (!trimmed) {
      setEmailError("Podaj adres e-mail dla swojego konta.")
      document.getElementById("forgot-email")?.focus()
      return
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("Podaj poprawny adres e-mail, np. jan@example.com.")
      document.getElementById("forgot-email")?.focus()
      return
    }

    setEmailError("")
    setIsSubmitting(true)
    try {
      await forgotPassword(trimmed)
      setSentTo(trimmed)
    } catch (error) {
      setEmailError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Zresetuj hasło"
      description="Wyślemy Ci bezpieczny link do ustawienia nowego hasła."
    >
      {sentTo ? (
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
            <p className="font-semibold">Sprawdź skrzynkę</p>
          </div>
          <p className="mt-2 text-sm text-balance text-slate-600 dark:text-neutral-400">
            Jeśli konto istnieje dla{" "}
            <span className="font-medium text-slate-900 dark:text-neutral-100">
              {sentTo}
            </span>
            , link do resetowania hasła jest już w drodze. Link wygaśnie po 30
            minutach.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 w-full"
            onClick={() => {
              setSentTo(null)
              setEmail("")
            }}
          >
            Użyj innego adresu e-mail
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Adres e-mail</Label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                id="forgot-email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="jan@example.com"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={
                  emailError ? "forgot-email-error" : "forgot-email-hint"
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 pl-10"
              />
            </div>
            {emailError ? (
              <p
                id="forgot-email-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {emailError}
              </p>
            ) : (
              <p
                id="forgot-email-hint"
                className="text-muted-foreground text-sm"
              >
                Podaj adres e-mail powiązany z Twoim kontem.
              </p>
            )}
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
                Wysyłanie…
              </>
            ) : (
              "Wyślij link"
            )}
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-slate-600 dark:text-neutral-400">
        <Link
          to="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          Powrót do logowania
        </Link>
      </p>
    </AuthLayout>
  )
}
