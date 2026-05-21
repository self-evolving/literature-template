import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { FullSlug, resolveRelative } from "../util/path"
import style from "./styles/docsExplorer.scss"

// @ts-ignore
import script from "./scripts/docsExplorer.inline"

type DocsNavItem = {
  title: string
  slug: FullSlug
  children?: DocsNavItem[]
}

const docsNav: DocsNavItem[] = [
  {
    title: "Overview",
    slug: "docs/overview/index" as FullSlug,
    children: [
      {
        title: "What is a self-evolving repository?",
        slug: "docs/overview/what-is-self-evolving-repo" as FullSlug,
      },
      { title: "Quick start", slug: "docs/overview/quick-start" as FullSlug },
    ],
  },
  {
    title: "Architecture",
    slug: "docs/architecture/index" as FullSlug,
    children: [
      { title: "Overall design", slug: "docs/architecture/overall-design" as FullSlug },
      { title: "Repository goals", slug: "docs/architecture/goals" as FullSlug },
      { title: "Repository memory", slug: "docs/architecture/memory" as FullSlug },
      { title: "User/team rubrics", slug: "docs/architecture/rubrics" as FullSlug },
      {
        title: "Request lifecycle",
        slug: "docs/architecture/request-lifecycle" as FullSlug,
      },
      {
        title: "Supported workflows",
        slug: "docs/architecture/supported-workflows" as FullSlug,
      },
    ],
  },
  {
    title: "Technical details",
    slug: "docs/technical-details/index" as FullSlug,
    children: [
      { title: "Key concepts", slug: "docs/technical-details/key-concepts" as FullSlug },
      {
        title: "Session continuity",
        slug: "docs/technical-details/session-continuity" as FullSlug,
      },
      {
        title: "Agent orchestrator",
        slug: "docs/technical-details/agent-orchestrator" as FullSlug,
      },
      { title: "Versioning", slug: "docs/technical-details/versioning" as FullSlug },
      {
        title: "Developer notes",
        slug: "docs/technical-details/developer-notes" as FullSlug,
      },
    ],
  },
  {
    title: "Actions",
    slug: "docs/actions/index" as FullSlug,
    children: [
      { title: "Internal actions", slug: "docs/actions/internal-actions" as FullSlug },
      { title: "Agent actions", slug: "docs/actions/agent-actions" as FullSlug },
    ],
  },
  {
    title: "Customization",
    slug: "docs/customization/index" as FullSlug,
    children: [
      {
        title: "Configuration list",
        slug: "docs/customization/configuration-list" as FullSlug,
      },
      { title: "Repository skills", slug: "docs/customization/skills" as FullSlug },
      { title: "Trigger access policy", slug: "docs/access-policy" as FullSlug },
      {
        title: "Creating actions",
        slug: "docs/customization/creating-your-own-actions" as FullSlug,
      },
      {
        title: "Creating workflows",
        slug: "docs/customization/creating-your-own-workflows" as FullSlug,
      },
    ],
  },
  {
    title: "Deployment",
    slug: "docs/deployment/index" as FullSlug,
    children: [
      { title: "Setup guide", slug: "docs/deployment/setup-guide" as FullSlug },
      {
        title: "Install into an existing repository",
        slug: "docs/deployment/install-existing-repository" as FullSlug,
      },
      {
        title: "Self-hosted runner",
        slug: "docs/deployment/self-hosted-github-action-runner" as FullSlug,
      },
      {
        title: "Using your own GitHub App",
        slug: "docs/deployment/using-your-own-github-app" as FullSlug,
      },
    ],
  },
]

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

function renderNavItem(currentSlug: FullSlug, item: DocsNavItem) {
  const active = isActive(currentSlug, item)
  const current = currentSlug === item.slug
  const hasChildren = item.children && item.children.length > 0
  const sectionId = hasChildren ? docsNavSectionId(item) : undefined
  const expanded = active

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
          <button
            type="button"
            class={["docs-nav-link docs-nav-section-button", current ? "active" : undefined]
              .filter(Boolean)
              .join(" ")}
            aria-controls={sectionId}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`}
            data-title={item.title}
            data-href={resolveRelative(currentSlug, item.slug)}
          >
            <span>{item.title}</span>
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
          <ul id={sectionId} class="docs-nav-children" hidden={!expanded}>
            {item.children!.map((child) => renderNavItem(currentSlug, child))}
          </ul>
        </>
      ) : (
        <a
          class={["docs-nav-link", current ? "active" : undefined].filter(Boolean).join(" ")}
          href={resolveRelative(currentSlug, item.slug)}
        >
          {item.title}
        </a>
      )}
    </li>
  )
}

const DocsExplorer: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const currentSlug = fileData.slug as FullSlug

  return (
    <nav class={classNames(displayClass, "docs-explorer")} aria-label="Documentation navigation">
      <ul class="docs-nav-root">
        <li
          class={[
            "docs-root-link",
            currentSlug === "docs" || currentSlug === "docs/index" ? "active" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <a
            class={[
              "docs-nav-link",
              currentSlug === "docs" || currentSlug === "docs/index" ? "active" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            href={resolveRelative(currentSlug, "docs/index" as FullSlug)}
          >
            Doc Index
          </a>
        </li>
        {docsNav.map((item) => renderNavItem(currentSlug, item))}
      </ul>
    </nav>
  )
}

DocsExplorer.css = style
DocsExplorer.afterDOMLoaded = script

export default (() => DocsExplorer) satisfies QuartzComponentConstructor
