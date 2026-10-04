import { Link } from "react-router-dom"
import { ArrowRight, Lightbulb } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { AssistantAction } from "../types"

/**
 * Call-to-action shown when the assistant finds no matching program
 * (`type === "no_solution"`). Links to the suggested route (e.g. /kreator).
 */
export function NoSolutionCta({ action }: { action: AssistantAction }) {
  const isExternal = /^https?:\/\//i.test(action.href)
  const className = cn(buttonVariants({ size: "lg" }), "w-full gap-2 sm:w-auto")

  const content = (
    <>
      <Lightbulb aria-hidden="true" />
      {action.label}
      <ArrowRight aria-hidden="true" />
    </>
  )

  return (
    <section aria-label="Sugerowane działanie" className="flex pt-1">
      {isExternal ? (
        <a
          href={action.href}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {content}
        </a>
      ) : (
        <Link to={action.href} className={className}>
          {content}
        </Link>
      )}
    </section>
  )
}
