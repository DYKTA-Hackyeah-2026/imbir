import { useEffect, useId, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react"

import AuthLayout from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type LoginErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {}
  const trimmed = email.trim()

  if (!trimmed) {
    errors.email = "Podaj adres e-mail."
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "Podaj poprawny adres e-mail, np. jan@example.com."
  }
  if (!password) {
    errors.password = "Podaj hasło."
  }
  return errors
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const rememberId = useId()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = "Zaloguj się · Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const nextErrors = validate(email, password)
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) {
      document
        .getElementById(nextErrors.email ? "login-email" : "login-password")
        ?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate("/", { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "Nieprawidłowy adres e-mail lub hasło."
          : errorMessage(error),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Zaloguj się" description="Zaloguj się, aby kontynuować.">
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
          <Label htmlFor="login-email">Adres e-mail</Label>
          <div className="relative">
            <Mail
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="jan@example.com"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 pl-10"
            />
          </div>
          {errors.email ? (
            <p
              id="login-email-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Hasło</Label>
          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
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
              id="login-password-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              id={rememberId}
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="border-input accent-primary focus-visible:ring-ring size-4 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <Label htmlFor={rememberId} className="font-normal">
              Zapamiętaj mnie
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="text-primary rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Nie pamiętasz hasła?
          </Link>
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
              Logowanie…
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600 dark:text-neutral-400">
        Nie masz konta?{" "}
        <Link
          to="/register"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          Zarejestruj się
        </Link>
      </p>
    </AuthLayout>
  )
}
