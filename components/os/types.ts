import type { ReactNode } from 'react'
import {
  CATEGORY_LABEL,
  type Category,
  type DaySummary,
  type EntryMeta,
  type Stats,
} from '@/lib/content'
import {
  BriefcaseIcon,
  CalendarIcon,
  DocIcon,
  FolderIcon,
  InfoIcon,
  LogIcon,
  PersonIcon,
  RouteIcon,
  SparkIcon,
  type IconComponent,
} from './icons'

/** An entry with its MDX body already rendered on the server. */
export interface RenderedEntry extends EntryMeta {
  content: ReactNode
}

export interface OsData {
  entries: RenderedEntry[]
  days: DaySummary[]
  stats: Stats
  pages: Record<'about' | 'roadmap' | 'readme', { title: string; content: ReactNode }>
}

export type View =
  | { type: 'learned' }
  | { type: 'day'; date: string }
  | { type: 'category'; date: string; category: Category }
  | { type: 'entry'; slug: string }
  | { type: 'log' }
  | { type: 'about' }
  | { type: 'roadmap' }
  | { type: 'readme' }

/** Stable identity for a view, so opening the same thing twice refocuses it. */
export function viewKey(view: View): string {
  switch (view.type) {
    case 'day':
      return `day:${view.date}`
    case 'category':
      return `category:${view.date}:${view.category}`
    case 'entry':
      return `entry:${view.slug}`
    default:
      return view.type
  }
}

export const CATEGORY_ICON: Record<Category, IconComponent> = {
  professional: BriefcaseIcon,
  personal: PersonIcon,
  fact: SparkIcon,
}

export interface WindowState {
  id: string
  view: View
  title: string
  icon: IconComponent
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
  /** Rect to restore to when un-maximising. */
  restore?: { x: number; y: number; w: number; h: number }
}

interface ViewChrome {
  title: string
  icon: IconComponent
  w: number
  h: number
}

export function chromeFor(view: View, data: OsData): ViewChrome {
  switch (view.type) {
    case 'learned':
      return { title: 'What I Learned', icon: CalendarIcon, w: 640, h: 460 }
    case 'day':
      return { title: view.date, icon: FolderIcon, w: 520, h: 340 }
    case 'category':
      return {
        title: `${CATEGORY_LABEL[view.category]} — ${view.date}`,
        icon: CATEGORY_ICON[view.category],
        w: 620,
        h: 470,
      }
    case 'entry': {
      const entry = data.entries.find((e) => e.slug === view.slug)
      return { title: entry?.title ?? 'Entry', icon: DocIcon, w: 620, h: 480 }
    }
    case 'log':
      return { title: 'Daily Log', icon: LogIcon, w: 660, h: 500 }
    case 'about':
      return { title: data.pages.about.title, icon: InfoIcon, w: 580, h: 460 }
    case 'roadmap':
      return { title: data.pages.roadmap.title, icon: RouteIcon, w: 580, h: 460 }
    case 'readme':
      return { title: data.pages.readme.title, icon: DocIcon, w: 560, h: 420 }
  }
}
