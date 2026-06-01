import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { registerCondition } from "./quartz/plugins/loader/conditions"
import { componentRegistry } from "./quartz/components/registry"
import type { QuartzComponent, QuartzComponentConstructor } from "./quartz/components/types"
import DocPageHeader from "./quartz/components/DocPageHeader"
import DocsExplorer from "./quartz/components/DocsExplorer"
import SepoPageTitle from "./quartz/components/SepoPageTitle"
import Comments from "./quartz/components/Comments"

const normalizeBaseUrl = (url?: string) => url?.replace(/^https?:\/\//, "").replace(/\/$/, "")
const siteBaseUrl =
  normalizeBaseUrl(
    process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
  ) ?? "repo-docs.vercel.app"

const isDocumentationPage = (slug?: string) =>
  slug === "docs" || slug === "docs/index" || (slug?.startsWith("docs/") ?? false)

const isDocumentationContentPage = (slug?: string) =>
  isDocumentationPage(slug) && slug !== "docs" && slug !== "docs/index"

registerCondition("docs-page", (page) => isDocumentationPage(page.fileData.slug))
registerCondition("docs-content-page", (page) => isDocumentationContentPage(page.fileData.slug))
registerCondition("not-docs-page", (page) => !isDocumentationPage(page.fileData.slug))
registerCondition(
  "not-index-or-docs-page",
  (page) => page.fileData.slug !== "index" && !isDocumentationPage(page.fileData.slug),
)

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

  return Comments({
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
      reactionsEnabled: booleanEnv("GISCUS_REACTIONS_ENABLED", false),
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

const EmptyComponent: QuartzComponent = () => null
const commentsComponent = giscusComments() ?? EmptyComponent
const SepoComments = (() => commentsComponent) satisfies QuartzComponentConstructor

componentRegistry.register("doc-page-header", DocPageHeader, "local")
componentRegistry.register("docs-explorer", DocsExplorer, "local")
componentRegistry.register("page-title", SepoPageTitle, "local")
componentRegistry.register("PageTitle", SepoPageTitle, "local")
componentRegistry.register("sepo-comments", SepoComments, "local")

const config = await loadQuartzConfig({ baseUrl: siteBaseUrl })
export default config
export const layout = await loadQuartzLayout()
