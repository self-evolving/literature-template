import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { trieFromAllFiles } from "../util/ctx"
import { FullSlug, resolveRelative, simplifySlug } from "../util/path"
import style from "./styles/docPageHeader.scss"

type HeaderCrumb = {
  label: string
  href: string
}

const LIBRARY_ROOT = "index" as FullSlug

const titleCase = (segment: string) =>
  segment.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase())

const titleFromSlug = (slug: string) => {
  const parts = slug.split("/").filter((part) => part.length > 0 && part !== "index")
  return titleCase(parts.at(-1) ?? "Literature Notes")
}

const displayName = (name: string) => name.replaceAll("-", " ")

const textValue = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  if (typeof value === "number") {
    return String(value)
  }

  return undefined
}

const textList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const text = textValue(item)
      return text ? [text] : []
    })
  }

  const text = textValue(value)
  return text ? [text] : []
}

const formatAuthors = (authors: string[]) =>
  authors.length > 3 ? `${authors.slice(0, 3).join(", ")} et al.` : authors.join(", ")

const doiHref = (doi: string) => {
  const normalized = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
  return `https://doi.org/${normalized}`
}

const DocPageHeader: QuartzComponent = ({
  cfg,
  fileData,
  allFiles,
  displayClass,
  ctx,
}: QuartzComponentProps) => {
  const slug = fileData.slug!
  const frontmatterTitle =
    typeof fileData.frontmatter?.title === "string" ? fileData.frontmatter.title : undefined
  const title =
    frontmatterTitle && !frontmatterTitle.startsWith("Folder: ")
      ? frontmatterTitle
      : titleFromSlug(slug)
  const date = getDate(cfg, fileData)
  const trie = (ctx.trie ??= trieFromAllFiles(allFiles))
  const pathNodes = trie.ancestryChain(slug.split("/")) ?? []
  const ancestorNodes = pathNodes.slice(1, -1)

  const crumbs: HeaderCrumb[] = [
    {
      label: "Home",
      href: resolveRelative(slug, LIBRARY_ROOT),
    },
    ...ancestorNodes
      .filter((node) => !["index"].includes(node.slugSegment))
      .map((node) => ({
        label: displayName(node.displayName),
        href: resolveRelative(slug, simplifySlug(node.slug)),
      })),
  ]

  const frontmatter = fileData.frontmatter
  const isPaper = frontmatter?.type === "paper" || slug.startsWith("papers/")
  const authors = textList(frontmatter?.authors)
  const metadataLine = [
    authors.length > 0 ? formatAuthors(authors) : undefined,
    textValue(frontmatter?.year),
    textValue(frontmatter?.venue),
  ]
    .filter(Boolean)
    .join(" · ")
  const citekey = textValue(frontmatter?.citekey)
  const doi = textValue(frontmatter?.doi)
  const url = textValue(frontmatter?.url)
  const paperLinks = [
    doi ? { label: "DOI", href: doiHref(doi) } : undefined,
    url ? { label: "Source", href: url } : undefined,
  ].filter((link): link is { label: string; href: string } => Boolean(link))
  const hasPaperMeta = isPaper && (metadataLine || citekey || paperLinks.length > 0)

  return (
    <header class={classNames(displayClass, "doc-page-header")}>
      <div class="doc-header-topline">
        <nav class="doc-breadcrumb" aria-label="Breadcrumb">
          <ol>
            {crumbs.map((crumb) => (
              <li>
                <a href={crumb.href}>{crumb.label}</a>
              </li>
            ))}
          </ol>
        </nav>
        {date && (
          <>
            <span class="meta-sep">·</span>
            <span class="doc-page-date">
              <Date date={date} locale={cfg.locale} />
            </span>
          </>
        )}
      </div>
      <h1 class="article-title doc-page-title">{title}</h1>
      {hasPaperMeta && (
        <div class="doc-paper-meta">
          {metadataLine && <p class="doc-paper-byline">{metadataLine}</p>}
          {(citekey || paperLinks.length > 0) && (
            <p class="doc-paper-identifiers">
              {citekey && <span class="doc-paper-citekey">@{citekey}</span>}
              {citekey && paperLinks.length > 0 && <span class="doc-paper-meta-sep">·</span>}
              {paperLinks.map((link, index) => (
                <>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                  {index < paperLinks.length - 1 && <span class="doc-paper-meta-sep">·</span>}
                </>
              ))}
            </p>
          )}
        </div>
      )}
    </header>
  )
}

DocPageHeader.css = style

export default (() => DocPageHeader) satisfies QuartzComponentConstructor
