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

type SepoCommentsTriggerMode = "pill" | "bot"
type SepoCommentsContentTab = "discussions" | "issues" | "pulls"
type HypothesisTheme = NonNullable<HypothesisOptions["theme"]>

const sepoCommentsContentTabs: readonly SepoCommentsContentTab[] = [
  "discussions",
  "issues",
  "pulls",
]

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

// Values that reach the browser as URL bases: a relative or scheme-less
// string would silently resolve against the page origin — fail the build.
function requireAbsoluteHttpUrl(name: string, value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute URL, got: ${value}`)
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${name} must use http(s), got: ${value}`)
  }
  return value
}

function sepoCommentsAppHost() {
  return requireAbsoluteHttpUrl(
    "SEPO_COMMENTS_APP_HOST",
    envValue("SEPO_COMMENTS_APP_HOST") ?? "https://comment-api.sepo-preview.xyz",
  )
}

function sepoComments() {
  // Comments are part of the literature-site product, so they default ON.
  // An explicit SEPO_COMMENTS_ENABLED=true upgrades missing pieces from a
  // warning (build continues without comments) to a hard build failure.
  const explicitlyConfigured = envValue("SEPO_COMMENTS_ENABLED") !== undefined
  if (!booleanEnv("SEPO_COMMENTS_ENABLED", true)) {
    return undefined
  }
  const unavailable = (reason: string) => {
    if (explicitlyConfigured) {
      throw new Error(`SEPO_COMMENTS_ENABLED=true but ${reason}`)
    }
    console.warn(`[sepo-comments] disabled: ${reason}`)
    return undefined
  }

  const repo = envValue("SEPO_COMMENTS_REPO")
  if (!repo) {
    return unavailable("SEPO_COMMENTS_REPO is not set")
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error("SEPO_COMMENTS_REPO must use the owner/name format")
  }

  const category = envValue("SEPO_COMMENTS_CATEGORY")
  if (!category) {
    return unavailable("SEPO_COMMENTS_CATEGORY is not set")
  }
  const repoId = envValue("SEPO_COMMENTS_REPO_ID")
  const categoryId = envValue("SEPO_COMMENTS_CATEGORY_ID")
  if (!repoId || !categoryId) {
    return unavailable(
      "SEPO_COMMENTS_REPO_ID/SEPO_COMMENTS_CATEGORY_ID are not set (the shipped " +
        "workflows resolve them automatically; for local or non-Actions builds pin them - " +
        "see README)",
    )
  }

  // All drawer tabs ship by default; SEPO_COMMENTS_TABS=discussions trims back.
  const tabs = (listEnv("SEPO_COMMENTS_TABS") as SepoCommentsContentTab[] | undefined) ?? [
    ...sepoCommentsContentTabs,
  ]
  for (const tab of tabs) {
    if (!sepoCommentsContentTabs.includes(tab)) {
      throw new Error(`SEPO_COMMENTS_TABS must only contain: ${sepoCommentsContentTabs.join(", ")}`)
    }
  }

  const contentRepo = envValue("SEPO_COMMENTS_CONTENT_REPO")
  if (contentRepo && !/^[\w.-]+\/[\w.-]+$/.test(contentRepo)) {
    throw new Error("SEPO_COMMENTS_CONTENT_REPO must use the owner/name format")
  }

  // Preview deployments bake the pull request they were built from through the
  // fixed SEPO_PREVIEW_* contract prepared by the workflow.
  const previewPr = envValue("SEPO_PREVIEW_PR")
  if (previewPr && !/^[1-9][0-9]*$/.test(previewPr)) {
    throw new Error("SEPO_PREVIEW_PR must be a positive pull request number")
  }
  const prNumber = previewPr ? Number(previewPr) : undefined
  if (prNumber && !tabs.includes("pulls")) {
    // Not fatal: the preview pill still works from the hostname/identity, but
    // the in-drawer PR deep-link needs the pulls tab.
    console.warn(
      `SEPO_PREVIEW_PR=${prNumber} is set but the pulls tab is not enabled ` +
        "(SEPO_COMMENTS_TABS); the drawer will not deep-link to the pull request.",
    )
  }
  const previewBranch = envValue("SEPO_PREVIEW_BRANCH")
  // For local pill testing: sepo.js only shows the pill on preview hostnames,
  // so a localhost build simulates one with SEPO_PREVIEW_DOMAIN=localhost.
  const previewDomain = envValue("SEPO_PREVIEW_DOMAIN")
  const previewApiValue = envValue("SEPO_PREVIEW_API")
  const previewApi = previewApiValue
    ? requireAbsoluteHttpUrl("SEPO_PREVIEW_API", previewApiValue)
    : undefined

  const explicitDefaultTab = optionalEnumEnv<SepoCommentsContentTab>(
    "SEPO_COMMENTS_DEFAULT_TAB",
    sepoCommentsContentTabs,
  )
  if (explicitDefaultTab && !tabs.includes(explicitDefaultTab)) {
    throw new Error(
      `SEPO_COMMENTS_DEFAULT_TAB=${explicitDefaultTab} is not one of the enabled tabs (${tabs.join(", ")})`,
    )
  }
  const defaultTab =
    explicitDefaultTab ?? (prNumber && tabs.includes("pulls") ? "pulls" : undefined)

  // The remaining widget options are Sepo product decisions, not site knobs:
  // pathname mapping, strict matching, no reactions, bottom composer, Sepo
  // themes, English UI. Re-expose one as env only when a real site needs it.
  return Comments({
    provider: "giscus",
    options: {
      repo: repo as `${string}/${string}`,
      repoId,
      category,
      categoryId,
      appHost: sepoCommentsAppHost(),
      mapping: "pathname",
      strict: true,
      reactionsEnabled: false,
      inputPosition: "bottom",
      lightTheme: "sepo_light",
      darkTheme: "sepo_dark",
      lang: "en",
      triggerMode: enumEnv<SepoCommentsTriggerMode>(
        "SEPO_COMMENTS_TRIGGER_MODE",
        ["pill", "bot"],
        "bot",
      ),
      tabs,
      defaultTab,
      contentRepo: contentRepo as `${string}/${string}` | undefined,
      prNumber,
      previewBranch,
      previewDomain,
      previewApi,
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
const commentsComponent = sepoComments() ?? EmptyComponent
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
