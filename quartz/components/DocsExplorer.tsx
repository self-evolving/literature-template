import path from "node:path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { FullSlug, resolveRelative } from "../util/path"
import { buildDocsNav, type DocsNavData, type DocsNavItem } from "../util/docsNav.mjs"
import style from "./styles/docsExplorer.scss"

// @ts-ignore
import script from "./scripts/docsExplorer.inline"

let docsNavCache: { key: string; data: DocsNavData } | undefined

function docsNavForContentRoot(contentRoot: string, buildId: string, ignorePatterns: string[]) {
  const navRoot = path.resolve(contentRoot)
  const key = `${buildId}:${navRoot}:${JSON.stringify(ignorePatterns)}`

  if (docsNavCache?.key === key) {
    return docsNavCache.data
  }

  const data = buildDocsNav({ docsRoot: navRoot, slugPrefix: "", ignorePatterns })
  docsNavCache = { key, data }
  return data
}

const isActive = (currentSlug: FullSlug, item: DocsNavItem) => {
  if (currentSlug === item.slug) {
    return true
  }

  const folderPrefix = item.slug.endsWith("/index")
    ? item.slug.slice(0, -"index".length)
    : `${item.slug}/`

  return currentSlug.startsWith(folderPrefix)
}

const docsNavSectionId = (item: DocsNavItem) =>
  `docs-nav-${item.slug.replace(/\/index$/, "").replace(/[^a-z0-9_-]+/gi, "-")}`

function renderNavItem(currentSlug: FullSlug, item: DocsNavItem, allSlugs: FullSlug[]) {
  const active = isActive(currentSlug, item)
  const current = currentSlug === item.slug
  const hasChildren = item.children && item.children.length > 0
  const sectionId = hasChildren ? docsNavSectionId(item) : undefined
  const expanded = active
  const itemHref = resolveRelative(currentSlug, item.slug)
  const hasPage = allSlugs.includes(item.slug)

  return (
    <li
      class={[
        active ? "active" : undefined,
        hasChildren ? "has-children docs-nav-section" : undefined,
        hasChildren ? (expanded ? "expanded" : "collapsed") : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasChildren ? (
        <>
          <div
            class={["docs-nav-link docs-nav-section-row", current ? "active" : undefined]
              .filter(Boolean)
              .join(" ")}
          >
            {hasPage ? (
              <a
                class="docs-nav-section-anchor"
                href={itemHref}
                data-controls={sectionId}
                data-title={item.title}
              >
                <span>{item.title}</span>
              </a>
            ) : (
              <button
                type="button"
                class="docs-nav-section-anchor docs-nav-section-action"
                aria-controls={sectionId}
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`}
                data-title={item.title}
              >
                <span>{item.title}</span>
              </button>
            )}
            <button
              type="button"
              class="docs-nav-section-toggle"
              aria-controls={sectionId}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`}
              data-title={item.title}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="fold"
              >
                <path d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          <ul id={sectionId} class="docs-nav-children" hidden={!expanded}>
            {item.children!.map((child) => renderNavItem(currentSlug, child, allSlugs))}
          </ul>
        </>
      ) : (
        <a
          class={["docs-nav-link", current ? "active" : undefined].filter(Boolean).join(" ")}
          href={itemHref}
        >
          {item.title}
        </a>
      )}
    </li>
  )
}

const DocsExplorer: QuartzComponent = ({
  ctx,
  cfg,
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const currentSlug = fileData.slug as FullSlug
  const docsNavData = docsNavForContentRoot(
    ctx.argv.directory,
    ctx.buildId,
    cfg.ignorePatterns ?? [],
  )
  const rootActive = currentSlug === docsNavData.root.slug

  return (
    <nav class={classNames(displayClass, "docs-explorer")} aria-label="Literature navigation">
      <ul class="docs-nav-root">
        <li class={["docs-root-link", rootActive ? "active" : undefined].filter(Boolean).join(" ")}>
          <a
            class={["docs-nav-link", rootActive ? "active" : undefined].filter(Boolean).join(" ")}
            href={resolveRelative(currentSlug, docsNavData.root.slug)}
          >
            {docsNavData.root.title}
          </a>
        </li>
        {docsNavData.items.map((item) => renderNavItem(currentSlug, item, ctx.allSlugs))}
      </ul>
    </nav>
  )
}

DocsExplorer.css = style
DocsExplorer.afterDOMLoaded = script

export default (() => DocsExplorer) satisfies QuartzComponentConstructor
