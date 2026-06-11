import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { registerCondition } from "./quartz/plugins/loader/conditions"
import { componentRegistry } from "./quartz/components/registry"
import type { QuartzComponent, QuartzComponentConstructor } from "./quartz/components/types"
import DocPageHeader from "./quartz/components/DocPageHeader"
import DocsExplorer from "./quartz/components/DocsExplorer"
import SepoGraph from "./quartz/components/SepoGraph"
import SepoFooter from "./quartz/components/SepoFooter"
import SepoPageTitle from "./quartz/components/SepoPageTitle"
import SepoSearch from "./quartz/components/SepoSearch"
import Comments from "./quartz/components/Comments"
import Hypothesis, { type Options as HypothesisOptions } from "./quartz/components/Hypothesis"

const normalizeBaseUrl = (url?: string) => url?.replace(/^https?:\/\//, "").replace(/\/$/, "")
const siteBaseUrl =
  normalizeBaseUrl(
    process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
  ) ?? "literature-template.vercel.app"

const isLibraryPage = (slug?: string) =>
  Boolean(slug && slug !== "index" && !slug.startsWith("tags/"))

registerCondition("library-page", (page) => isLibraryPage(page.fileData.slug))

type GiscusMapping = "url" | "title" | "og:title" | "specific" | "number" | "pathname"
type GiscusInputPosition = "top" | "bottom"
type GiscusTriggerMode = "pill" | "bot"
type GiscusContentTab = "discussions" | "issues" | "pulls"
type HypothesisTheme = NonNullable<HypothesisOptions["theme"]>

const giscusContentTabs: readonly GiscusContentTab[] = ["discussions", "issues", "pulls"]

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

function optionalEnumEnv<T extends string>(name: string, allowed: readonly T[]) {
  const value = envValue(name)
  if (value === undefined) return undefined
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${name} must be one of: ${allowed.join(", ")}`)
}

function listEnv(name: string) {
  const value = envValue(name)
  if (value === undefined) return undefined
  const items = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

function giscusAppHost() {
  const appHost = envValue("GISCUS_APP_HOST") ?? "https://comment-api.sepo.sh"
  // The value reaches the browser, where a relative or scheme-less string
  // would silently resolve against the page origin — fail the build instead.
  let parsed: URL
  try {
    parsed = new URL(appHost)
  } catch {
    throw new Error(`GISCUS_APP_HOST must be an absolute URL, got: ${appHost}`)
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`GISCUS_APP_HOST must use http(s), got: ${appHost}`)
  }
  return appHost
}

function giscusComments() {
  if (!booleanEnv("GISCUS_ENABLED", false)) {
    return undefined
  }

  const envConfig = Object.fromEntries(giscusRequiredEnv.map((name) => [name, envValue(name)]))
  const missing = giscusRequiredEnv.filter((name) => !envConfig[name])
  if (missing.length > 0) {
    throw new Error(`GISCUS_ENABLED=true requires: ${missing.join(", ")}`)
  }

  const repo = envConfig.GISCUS_REPO as string
  const repoId = envConfig.GISCUS_REPO_ID as string
  const category = envConfig.GISCUS_CATEGORY as string
  const categoryId = envConfig.GISCUS_CATEGORY_ID as string

  if (!repo.includes("/")) {
    throw new Error("GISCUS_REPO must use the owner/name format")
  }

  const tabs = listEnv("GISCUS_TABS") as GiscusContentTab[] | undefined
  for (const tab of tabs ?? []) {
    if (!giscusContentTabs.includes(tab)) {
      throw new Error(`GISCUS_TABS must only contain: ${giscusContentTabs.join(", ")}`)
    }
  }

  const contentRepo = envValue("GISCUS_CONTENT_REPO")
  if (contentRepo && !contentRepo.includes("/")) {
    throw new Error("GISCUS_CONTENT_REPO must use the owner/name format")
  }

  // Preview deployments bake the pull request they were built from so the
  // drawer can open directly on that PR's conversation.
  const previewPr = envValue("SEPO_PREVIEW_PR")
  if (previewPr && !/^[1-9][0-9]*$/.test(previewPr)) {
    throw new Error("SEPO_PREVIEW_PR must be a positive pull request number")
  }
  const prNumber = previewPr ? Number(previewPr) : undefined
  if (prNumber && !tabs?.includes("pulls")) {
    // Not fatal: the preview pill still works from the hostname/identity, but
    // the in-drawer PR deep-link needs the pulls tab.
    console.warn(
      `SEPO_PREVIEW_PR=${prNumber} is set but the pulls tab is not enabled (GISCUS_TABS); ` +
        "the drawer will not deep-link to the pull request.",
    )
  }
  const previewBranch = envValue("SEPO_PREVIEW_BRANCH")
  // For local pill testing: sepo.js only shows the pill on preview hostnames,
  // so a localhost build simulates one with SEPO_PREVIEW_DOMAIN=localhost.
  const previewDomain = envValue("SEPO_PREVIEW_DOMAIN")

  const explicitDefaultTab = optionalEnumEnv<GiscusContentTab>(
    "GISCUS_DEFAULT_TAB",
    giscusContentTabs,
  )
  const enabledTabs: readonly GiscusContentTab[] = tabs ?? ["discussions"]
  if (explicitDefaultTab && !enabledTabs.includes(explicitDefaultTab)) {
    throw new Error(
      `GISCUS_DEFAULT_TAB=${explicitDefaultTab} is not one of the enabled tabs (${enabledTabs.join(", ")})`,
    )
  }
  const defaultTab =
    explicitDefaultTab ?? (prNumber && tabs?.includes("pulls") ? "pulls" : undefined)

  return Comments({
    provider: "giscus",
    options: {
      repo: repo as `${string}/${string}`,
      repoId,
      category,
      categoryId,
      appHost: giscusAppHost(),
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
      lightTheme: envValue("GISCUS_LIGHT_THEME") ?? "sepo_light",
      darkTheme: envValue("GISCUS_DARK_THEME") ?? "sepo_dark",
      lang: envValue("GISCUS_LANG") ?? "en",
      triggerMode: enumEnv<GiscusTriggerMode>("GISCUS_TRIGGER_MODE", ["pill", "bot"], "pill"),
      tabs,
      defaultTab,
      contentRepo: contentRepo as `${string}/${string}` | undefined,
      prNumber,
      previewBranch,
      previewDomain,
    },
  })
}

function hypothesisAnnotations() {
  if (!booleanEnv("HYPOTHESIS_ENABLED", false)) {
    return undefined
  }

  return Hypothesis({
    enabled: true,
    openSidebar: booleanEnv("HYPOTHESIS_OPEN_SIDEBAR", false),
    showHighlights: booleanEnv("HYPOTHESIS_SHOW_HIGHLIGHTS", true),
    commentsMode: booleanEnv("HYPOTHESIS_COMMENTS_MODE", false),
    groupsAllowlist: listEnv("HYPOTHESIS_GROUPS_ALLOWLIST"),
    theme: optionalEnumEnv<HypothesisTheme>("HYPOTHESIS_THEME", ["classic", "clean"]),
  })
}

const EmptyComponent: QuartzComponent = () => null
const commentsComponent = giscusComments() ?? EmptyComponent
const hypothesisComponent = hypothesisAnnotations() ?? EmptyComponent
const LiteratureComments = (() => commentsComponent) satisfies QuartzComponentConstructor
const LiteratureAnnotations = (() => hypothesisComponent) satisfies QuartzComponentConstructor

componentRegistry.register("doc-page-header", DocPageHeader, "local")
componentRegistry.register("docs-explorer", DocsExplorer, "local")
componentRegistry.register("footer", SepoFooter, "local")
componentRegistry.register("Footer", SepoFooter, "local")
componentRegistry.register("graph", SepoGraph, "local")
componentRegistry.register("hypothesis", LiteratureAnnotations, "local")
componentRegistry.register("page-title", SepoPageTitle, "local")
componentRegistry.register("PageTitle", SepoPageTitle, "local")
componentRegistry.register("search", SepoSearch, "local")
componentRegistry.register("sepo-comments", LiteratureComments, "local")

const config = await loadQuartzConfig({ baseUrl: siteBaseUrl })
export default config
export const layout = await loadQuartzLayout()
