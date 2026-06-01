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
    </header>
  )
}

DocPageHeader.css = style

export default (() => DocPageHeader) satisfies QuartzComponentConstructor
