import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, User } from "lucide-react"

import AuthLayout from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, errorMessage, validationDetails } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SignUpErrors = {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validate(
  name: string,
  email: string,
  password: string,
  confirm: string,
): SignUpErrors {
  const errors: SignUpErrors = {}
  const trimmed = email.trim()
  const trimmedName = name.trim()

  if (!trimmedName) {
    errors.name = "Podaj nazwę użytkownika."
  } else if (trimmedName.length < 2) {
    errors.name = "Nazwa musi mieć co najmniej 2 znaki."
  } else if (trimmedName.length > 60) {
    errors.name = "Nazwa może mieć maksymalnie 60 znaków."
  }

  if (!trimmed) {
    errors.email = "Podaj adres e-mail."
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "Podaj poprawny adres e-mail, np. jan@example.com."
  }

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

function mapServerErrors(error: unknown): SignUpErrors {
  const mapped: SignUpErrors = {}
  for (const detail of validationDetails(error)) {
    if (
      detail.path === "name" ||
      detail.path === "email" ||
      detail.path === "password"
    ) {
      mapped[detail.path] = detail.message
    }
  }
  if (error instanceof ApiError && error.status === 409) {
    mapped.email = "Ten adres e-mail jest już zarejestrowany. Zaloguj się."
  }
  return mapped
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = "Utwórz konto · Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const nextErrors = validate(name, email, password, confirm)
    setErrors(nextErrors)
    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.confirmPassword
    ) {
      const first = nextErrors.name
        ? "register-name"
        : nextErrors.email
          ? "register-email"
          : nextErrors.password
            ? "register-password"
            : "register-confirm"
      document.getElementById(first)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate("/", { replace: true })
    } catch (error) {
      const serverErrors = mapServerErrors(error)
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors)
      } else {
        setFormError(errorMessage(error))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Utwórz konto"
      description="Załóż konto, aby korzystać z bazy wiedzy."
    >
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
          <Label htmlFor="register-name">Nazwa użytkownika</Label>
          <div className="relative">
            <User
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="register-name"
              name="name"
              type="text"
              placeholder="Jan Kowalski"
              autoComplete="nickname"
              required
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={
                errors.name ? "register-name-error" : "register-name-hint"
              }
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 pl-10"
            />
          </div>
          {errors.name ? (
            <p
              id="register-name-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.name}
            </p>
          ) : (
            <p
              id="register-name-hint"
              className="text-muted-foreground text-sm"
            >
              Ta nazwa będzie widoczna w czatach.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Adres e-mail</Label>
          <div className="relative">
            <Mail
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="register-email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="jan@example.com"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={
                errors.email ? "register-email-error" : undefined
              }
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 pl-10"
            />
          </div>
          {errors.email ? (
            <p
              id="register-email-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Hasło</Label>
          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password
                  ? "register-password-error"
                  : "register-password-hint"
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
              id="register-password-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.password}
            </p>
          ) : (
            <p
              id="register-password-hint"
              className="text-muted-foreground text-sm"
            >
              8–64 znaki, w tym wielka litera, mała litera i cyfra.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-confirm">Potwierdź hasło</Label>
          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="register-confirm"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={errors.confirmPassword ? true : undefined}
              aria-describedby={
                errors.confirmPassword ? "register-confirm-error" : undefined
              }
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-10 pl-10"
            />
          </div>
          {errors.confirmPassword ? (
            <p
              id="register-confirm-error"
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
              Tworzenie konta…
            </>
          ) : (
            "Utwórz konto"
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600 dark:text-neutral-400">
        Masz już konto?{" "}
        <Link
          to="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          Zaloguj się
        </Link>
      </p>
    </AuthLayout>
  )
}
