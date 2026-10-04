import type { ComponentType } from "react"
import {
  Accessibility,
  FileText,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  MapPin,
  Play,
  UserRound,
  Users,
  UsersRound,
  Wifi,
} from "lucide-react"

export type IconType = ComponentType<{ className?: string }>

const ICONS: Record<string, IconType> = {
  lightbulb: Lightbulb,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  play: Play,
  "map-pin": MapPin,
  users: Users,
  "heart-pulse": HeartPulse,
  accessibility: Accessibility,
  wifi: Wifi,
  "users-round": UsersRound,
  "user-round": UserRound,
}

export function materialIcon(key: string | null | undefined): IconType {
  return (key && ICONS[key]) || Lightbulb
}

export type Accent = {
  card: string
  icon: string
  badge: string
}

const ACCENTS: Record<string, Accent> = {
  blue: {
    card: "bg-blue-50/70 dark:bg-blue-500/10",
    icon: "bg-blue-600 text-white",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  },
  rose: {
    card: "bg-rose-50/70 dark:bg-rose-500/10",
    icon: "bg-rose-500 text-white",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
  emerald: {
    card: "bg-emerald-50/70 dark:bg-emerald-500/10",
    icon: "bg-emerald-500 text-white",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  violet: {
    card: "bg-violet-50/70 dark:bg-violet-500/10",
    icon: "bg-violet-500 text-white",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  },
  amber: {
    card: "bg-amber-50/70 dark:bg-amber-500/10",
    icon: "bg-amber-500 text-white",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  teal: {
    card: "bg-teal-50/70 dark:bg-teal-500/10",
    icon: "bg-teal-500 text-white",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
  },
}

export function accentClasses(accent: string | null | undefined): Accent {
  return (accent && ACCENTS[accent]) || ACCENTS.blue
}
