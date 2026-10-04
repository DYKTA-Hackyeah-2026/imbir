import { useId } from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ChoiceOption } from "../types"
import { FieldError, RequiredMark } from "./FormFields"

function optionClass(selected: boolean): string {
  return cn(
    "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2",
    selected
      ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 dark:border-blue-500 dark:bg-blue-950/40"
      : "border-slate-200 bg-white hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-800",
  )
}

export function RadioCardGroup<T extends string>({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  error,
  required,
  columns = 2,
}: {
  legend: string
  hint?: string
  name: string
  options: ChoiceOption<T>[]
  value: T | ""
  onChange: (value: T) => void
  error?: string
  required?: boolean
  columns?: 1 | 2 | 3
}) {
  const groupId = useId()
  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={[hint ? `${groupId}-hint` : undefined, error ? `${groupId}-error` : undefined].filter(Boolean).join(" ") || undefined}>
      <legend className="text-base font-medium">
        {legend} {required ? <RequiredMark /> : null}
      </legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          "mt-3 grid gap-3",
          columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {options.map((option) => {
          const selected = value === option.value
          return (
            <label key={option.value} className={optionClass(selected)}>
              <input
                type="radio"
                name={name}
                required={required}
                value={option.value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${groupId}-error` : undefined}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.emoji ? (
                <span aria-hidden="true" className="text-3xl leading-none">
                  {option.emoji}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-sm text-slate-500 dark:text-neutral-400">
                    {option.description}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-blue-600" : "border-slate-300 dark:border-neutral-600",
                )}
              >
                {selected ? <span className="size-2.5 rounded-full bg-blue-600" /> : null}
              </span>
            </label>
          )
        })}
      </div>
      <div className="mt-2">
        <FieldError id={`${groupId}-error`} message={error} />
      </div>
    </fieldset>
  )
}

export function CheckboxCardGroup({
  legend,
  hint,
  options,
  values,
  onChange,
  error,
  columns = 3,
}: {
  legend: string
  hint?: string
  options: readonly string[]
  values: string[]
  onChange: (values: string[]) => void
  error?: string
  columns?: 1 | 2 | 3
}) {
  const groupId = useId()

  function toggle(option: string) {
    onChange(
      values.includes(option)
        ? values.filter((value) => value !== option)
        : [...values, option],
    )
  }

  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={[hint ? `${groupId}-hint` : undefined, error ? `${groupId}-error` : undefined].filter(Boolean).join(" ") || undefined}>
      <legend className="text-base font-medium">
        {legend} <RequiredMark />
      </legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          "mt-3 grid gap-3",
          columns === 1 ? "grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <label key={option} className={cn(optionClass(selected), "py-3")}>
              <input
                type="checkbox"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${groupId}-error` : undefined}
                checked={selected}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 dark:border-neutral-600",
                )}
              >
                {selected ? <Check className="size-3.5" /> : null}
              </span>
              <span className="font-medium">{option}</span>
            </label>
          )
        })}
      </div>
      <div className="mt-2">
        <FieldError id={`${groupId}-error`} message={error} />
      </div>
    </fieldset>
  )
}

const SCALE_DOT_COLORS = [
  "border-orange-500",
  "border-amber-400",
  "border-sky-400",
  "border-emerald-500",
] as const

export function FrequencyScale<T extends string>({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string
  hint?: string
  name: string
  options: ChoiceOption<T>[]
  value: T | ""
  onChange: (value: T) => void
  error?: string
}) {
  const groupId = useId()
  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={[hint ? `${groupId}-hint` : undefined, error ? `${groupId}-error` : undefined].filter(Boolean).join(" ") || undefined}>
      <legend className="text-base font-medium">
        {legend} <RequiredMark />
      </legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
      <div className="relative mt-5">
        <div
          aria-hidden="true"
          className="absolute top-3 right-[10%] left-[10%] h-1 rounded-full bg-gradient-to-r from-orange-400 via-sky-300 to-emerald-400 opacity-60"
        />
        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
          {options.map((option, index) => {
            const selected = value === option.value
            return (
              <label
                key={option.value}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2"
              >
                <input
                  type="radio"
                  name={name}
                  required
                  value={option.value}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${groupId}-error` : undefined}
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-7 rounded-full border-4 bg-white transition-transform dark:bg-neutral-900",
                    selected
                      ? `${SCALE_DOT_COLORS[index] ?? "border-blue-500"} scale-110`
                      : "border-slate-300 dark:border-neutral-600",
                  )}
                />
                <span className="text-sm font-semibold">{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-slate-500 dark:text-neutral-400">
                    {option.description}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
      </div>
      <div className="mt-2">
        <FieldError id={`${groupId}-error`} message={error} />
      </div>
    </fieldset>
  )
}

export function RadioChipGroup<T extends string>({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string
  hint?: string
  name: string
  options: ChoiceOption<T>[]
  value: T | ""
  onChange: (value: T) => void
  error?: string
}) {
  const groupId = useId()
  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={[hint ? `${groupId}-hint` : undefined, error ? `${groupId}-error` : undefined].filter(Boolean).join(" ") || undefined}>
      <legend className="text-base font-medium">{legend}</legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{hint}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${groupId}-error` : undefined}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          )
        })}
      </div>
      <div className="mt-2">
        <FieldError id={`${groupId}-error`} message={error} />
      </div>
    </fieldset>
  )
}
