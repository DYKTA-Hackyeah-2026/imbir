import { useState, type FormEvent, type KeyboardEvent } from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Napisz, w czym potrzebujesz pomocy…",
}: {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState("")
  const trimmed = value.trim()

  function submit() {
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-200/80 p-3 dark:border-neutral-800"
    >
      <label htmlFor="assistant-chat-input" className="sr-only">
        Twoja wiadomość do asystenta
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="assistant-chat-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          readOnly={disabled}
          aria-busy={disabled}
          aria-describedby="assistant-chat-hint"
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-14 w-full resize-y rounded-lg border px-3 py-2 text-base outline-none focus-visible:ring-3 disabled:opacity-60 md:text-sm dark:bg-input/30"
        />
        <Button
          type="submit"
          size="lg"
          disabled={disabled || !trimmed}
          className="shrink-0"
        >
          <Send aria-hidden="true" />
          Wyślij
        </Button>
      </div>
      <p
        id="assistant-chat-hint"
        className="text-muted-foreground mt-1.5 text-xs"
      >
        Naciśnij Enter, aby wysłać. Shift+Enter dodaje nową linię.
      </p>
    </form>
  )
}
