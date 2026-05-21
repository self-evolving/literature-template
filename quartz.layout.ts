import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const isDocumentationPage = (slug?: string) =>
  slug === "docs" || slug === "docs/index" || (slug?.startsWith("docs/") ?? false)

const isDocumentationContentPage = (slug?: string) =>
  isDocumentationPage(slug) && slug !== "docs" && slug !== "docs/index"

type GiscusMapping = "url" | "title" | "og:title" | "specific" | "number" | "pathname"
type GiscusInputPosition = "top" | "bottom"

const defaultGiscusConfig = {
  repo: "self-evolving/repo-discussions",
  repoId: "R_kgDOSjgnjQ",
  category: "General",
  categoryId: "DIC_kwDOSjgnjc4C9gaF",
} as const

const giscusRequiredEnv = [
  "GISCUS_REPO",
  "GISCUS_REPO_ID",
  "GISCUS_CATEGORY",
  "GISCUS_CATEGORY_ID",
] as const

function envValue(name: string) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : undefined
}

function booleanEnv(name: string, defaultValue: boolean) {
  const value = envValue(name)?.toLowerCase()
  if (value === undefined) return defaultValue
  if (["1", "true", "yes", "on"].includes(value)) return true
  if (["0", "false", "no", "off"].includes(value)) return false
  throw new Error(`${name} must be a boolean value`)
}

function enumEnv<T extends string>(name: string, allowed: readonly T[], defaultValue: T) {
  const value = envValue(name)
  if (value === undefined) return defaultValue
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${name} must be one of: ${allowed.join(", ")}`)
}

function giscusComments() {
  if (!booleanEnv("GISCUS_ENABLED", true)) {
    return undefined
  }

  const envConfig = Object.fromEntries(giscusRequiredEnv.map((name) => [name, envValue(name)]))
  const hasEnvConfig = Object.values(envConfig).some(Boolean)

  if (hasEnvConfig) {
    const missing = giscusRequiredEnv.filter((name) => !envConfig[name])
    if (missing.length > 0) {
      throw new Error(`Incomplete Giscus configuration. Missing: ${missing.join(", ")}`)
    }
  }

  const repo = envConfig.GISCUS_REPO ?? defaultGiscusConfig.repo
  const repoId = envConfig.GISCUS_REPO_ID ?? defaultGiscusConfig.repoId
  const category = envConfig.GISCUS_CATEGORY ?? defaultGiscusConfig.category
  const categoryId = envConfig.GISCUS_CATEGORY_ID ?? defaultGiscusConfig.categoryId

  if (!repo.includes("/")) {
    throw new Error("GISCUS_REPO must use the owner/name format")
  }

  return Component.Comments({
    provider: "giscus",
    options: {
      repo: repo as `${string}/${string}`,
      repoId,
      category,
      categoryId,
      mapping: enumEnv<GiscusMapping>(
        "GISCUS_MAPPING",
        ["url", "title", "og:title", "specific", "number", "pathname"],
        "pathname",
      ),
      strict: booleanEnv("GISCUS_STRICT", true),
      reactionsEnabled: booleanEnv("GISCUS_REACTIONS_ENABLED", true),
      inputPosition: enumEnv<GiscusInputPosition>(
        "GISCUS_INPUT_POSITION",
        ["top", "bottom"],
        "bottom",
      ),
      lightTheme: envValue("GISCUS_LIGHT_THEME") ?? "light",
      darkTheme: envValue("GISCUS_DARK_THEME") ?? "dark",
      themeUrl: envValue("GISCUS_THEME_URL"),
      lang: envValue("GISCUS_LANG") ?? "en",
    },
  })
}

const docPageHeader = Component.DocPageHeader()

const docsExplorer = Component.DocsExplorer()
const comments = giscusComments()

const afterBody = comments
  ? [
      Component.ConditionalRender({
        component: comments,
        condition: (page) => isDocumentationContentPage(page.fileData.slug),
      }),
    ]
  : []

const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.MobileOnly(Component.Darkmode()),
  Component.MobileOnly(Component.Search()),
  Component.DesktopOnly(
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
  ),
  docsExplorer,
]

const right = [
  Component.Graph({
    localGraph: { showTags: false },
    globalGraph: { showTags: false },
  }),
  Component.DesktopOnly(Component.TableOfContents()),
  Component.Backlinks(),
]

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody,
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: docPageHeader,
      condition: (page) => isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) =>
        page.fileData.slug !== "index" && !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta({ showReadingTime: false }),
      condition: (page) =>
        page.fileData.slug !== "index" && !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
  ],
  left: left.map((component) =>
    Component.ConditionalRender({
      component,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
  right: right.map((component) =>
    Component.ConditionalRender({
      component,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: docPageHeader,
      condition: (page) => isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
  ],
  left,
  right: [],
}
