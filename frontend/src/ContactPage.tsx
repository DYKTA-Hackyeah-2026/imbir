import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, Mail, Send, User } from "lucide-react"

import SiteLayout from "@/components/SiteLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, errorMessage } from "@/lib/api"
import {
  localizeFieldErrors,
  submitContact,
  type FieldError,
} from "@/lib/content"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ContactErrors = {
  name?: string
  email?: string
  subject?: string
  message?: string
}

function validate(values: {
  name: string
  email: string
  message: string
}): ContactErrors {
  const errors: ContactErrors = {}
  if (!values.name.trim()) errors.name = "Podaj imię i nazwisko."
  else if (values.name.trim().length < 2)
    errors.name = "Imię i nazwisko musi mieć co najmniej 2 znaki."

  if (!values.email.trim()) errors.email = "Podaj adres e-mail."
  else if (!EMAIL_PATTERN.test(values.email.trim()))
    errors.email = "Podaj poprawny adres e-mail."

  if (!values.message.trim()) errors.message = "Wpisz wiadomość."
  else if (values.message.trim().length < 10)
    errors.message = "Wiadomość musi mieć co najmniej 10 znaków."

  return errors
}

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [errors, setErrors] = useState<ContactErrors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = "Kontakt · Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const nextErrors = validate({ name, email, message })
    setErrors(nextErrors)
    const firstInvalid = nextErrors.name
      ? "contact-name"
      : nextErrors.email
        ? "contact-email"
        : nextErrors.message
          ? "contact-message"
          : null
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      })
      setSent(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        const details = Array.isArray(caught.details)
          ? (caught.details as FieldError[])
          : []
        const mapped = localizeFieldErrors(details) as ContactErrors
        if (Object.keys(mapped).length > 0) setErrors(mapped)
        else setFormError("Popraw zaznaczone pola.")
      } else {
        setFormError(errorMessage(caught))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Kontakt
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nie wiesz, czego szukasz? Napisz do nas — pomożemy znaleźć odpowiednie
          materiały.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          {sent ? (
            <div role="status" aria-live="polite" className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-6 text-emerald-600"
                />
              </div>
              <h2 className="text-lg font-semibold">Wiadomość wysłana</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Dziękujemy. Odezwiemy się najszybciej, jak to możliwe.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSent(false)
                  setName("")
                  setEmail("")
                  setSubject("")
                  setMessage("")
                }}
              >
                Wyślij kolejną wiadomość
              </Button>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Imię i nazwisko</Label>
                  <div className="relative">
                    <User
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Jan Kowalski"
                      autoComplete="name"
                      required
                      aria-invalid={errors.name ? true : undefined}
                      className="h-10 pl-10"
                    />
                  </div>
                  {errors.name ? (
                    <p role="alert" className="text-destructive text-sm">
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Adres e-mail</Label>
                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                      id="contact-email"
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="jan@example.com"
                      autoComplete="email"
                      required
                      aria-invalid={errors.email ? true : undefined}
                      className="h-10 pl-10"
                    />
                  </div>
                  {errors.email ? (
                    <p role="alert" className="text-destructive text-sm">
                      {errors.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Temat</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Opcjonalnie"
                  className="h-10"
                />
                {errors.subject ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.subject}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Wiadomość</Label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="W czym możemy pomóc?"
                  rows={5}
                  required
                  aria-invalid={errors.message ? true : undefined}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
                />
                {errors.message ? (
                  <p role="alert" className="text-destructive text-sm">
                    {errors.message}
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
                    Wysyłanie…
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" className="size-4" />
                    Wyślij wiadomość
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
