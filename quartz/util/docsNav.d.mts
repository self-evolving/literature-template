import type { FullSlug } from "./path"

export type DocsNavItem = {
  title: string
  slug: FullSlug
  children?: DocsNavItem[]
}

export type DocsNavData = {
  root: DocsNavItem
  items: DocsNavItem[]
}

export const defaultDocsRoot: string
export const defaultDocsSlugPrefix: string

export function buildDocsNav(options?: {
  docsRoot?: string
  slugPrefix?: string
  ignorePatterns?: string[]
}): DocsNavData
