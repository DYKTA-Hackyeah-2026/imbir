import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        strong:
          "border-emerald-600/20 bg-emerald-600/10 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
        good: "border-sky-600/20 bg-sky-600/10 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300",
        ok: "border-amber-600/20 bg-amber-600/10 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
        weak: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:border-zinc-400/30 dark:bg-zinc-400/10 dark:text-zinc-300",
        ai: "border-violet-600/20 bg-violet-600/10 text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
        fact: "border-teal-600/20 bg-teal-600/10 text-teal-800 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
