import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-sky-600/20 bg-sky-600/5 text-foreground [&>svg]:text-sky-700 dark:border-sky-400/30 dark:[&>svg]:text-sky-300",
        warning:
          "border-amber-600/20 bg-amber-600/5 text-foreground [&>svg]:text-amber-700 dark:border-amber-400/30 dark:[&>svg]:text-amber-300",
        destructive:
          "border-destructive/30 bg-destructive/5 text-foreground [&>svg]:text-destructive",
        demo: "border-violet-600/25 bg-violet-600/5 text-foreground [&>svg]:text-violet-700 dark:border-violet-400/30 dark:[&>svg]:text-violet-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === "destructive" ? "alert" : undefined}
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
