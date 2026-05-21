import fs from "node:fs"
import path from "node:path"

export const defaultDocsRoot = "content/docs"
export const defaultDocsSlugPrefix = "docs"

function toPosix(filePath) {
  return filePath.split(path.sep).join("/")
}

function normalizeRel(filePath) {
  const rel = toPosix(filePath)
  return rel === "." ? "" : rel
}

function posixJoin(...segments) {
  return segments.filter(Boolean).join("/")
}

function docsPath(rel) {
  return rel ? `docs/${rel}` : "docs"
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(absPath))
    } else if (entry.isFile()) {
      files.push(absPath)
    }
  }

  return files
}

function frontmatterMatch(markdown) {
  return markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
}

function unquoteYamlString(value) {
  const trimmed = value.trim()

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed)
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'")
  }

  return trimmed
}

function markdownTitle(filePath, fileRel) {
  const markdown = fs.readFileSync(filePath, "utf8")
  const match = frontmatterMatch(markdown)
  const titleMatch = match?.[1]?.match(/^title\s*:\s*(.+?)\s*$/m)

  if (!titleMatch) {
    throw new Error(`${docsPath(fileRel)} must define frontmatter with a title field`)
  }

  let title
  try {
    title = unquoteYamlString(titleMatch[1])
  } catch (error) {
    throw new Error(`Could not parse title in ${docsPath(fileRel)}: ${error.message}`)
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error(`${docsPath(fileRel)} must define frontmatter with a non-empty title field`)
  }

  return title.trim()
}

function validatePageSegment(segment, metaRel) {
  if (typeof segment !== "string") {
    throw new Error(`${docsPath(metaRel)} pages entries must be strings`)
  }

  if (segment.trim() !== segment || segment.length === 0) {
    throw new Error(`${docsPath(metaRel)} has an invalid pages entry ${JSON.stringify(segment)}`)
  }

  if (segment === "index") {
    throw new Error(`${docsPath(metaRel)} must not list index; index.md is implicit`)
  }

  if (segment.endsWith(".md")) {
    throw new Error(`${docsPath(metaRel)} pages entry ${JSON.stringify(segment)} must omit .md`)
  }

  if (segment.includes("/") || segment.includes("\\") || segment === "." || segment === "..") {
    throw new Error(
      `${docsPath(metaRel)} pages entry ${JSON.stringify(segment)} must be a single slug segment`,
    )
  }
}

function readMeta(folderPath, folderRel) {
  const metaRel = posixJoin(folderRel, "_meta.json")
  const metaPath = path.join(folderPath, "_meta.json")

  if (!isFile(metaPath)) {
    throw new Error(`${docsPath(metaRel)} is required for docs navigation`)
  }

  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(metaPath, "utf8"))
  } catch (error) {
    throw new Error(`Could not parse ${docsPath(metaRel)}: ${error.message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${docsPath(metaRel)} must be a JSON object`)
  }

  const { label, pages } = parsed
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error(`${docsPath(metaRel)} must define a non-empty label string`)
  }

  if (!Array.isArray(pages)) {
    throw new Error(`${docsPath(metaRel)} must define a pages array`)
  }

  const seen = new Set()
  for (const segment of pages) {
    validatePageSegment(segment, metaRel)

    if (seen.has(segment)) {
      throw new Error(`${docsPath(metaRel)} lists ${JSON.stringify(segment)} more than once`)
    }
    seen.add(segment)
  }

  return { label: label.trim(), pages }
}

function slugForMarkdown(fileRel, slugPrefix) {
  return posixJoin(slugPrefix, fileRel.replace(/\.md$/i, ""))
}

function slugForFolder(folderRel, slugPrefix) {
  return posixJoin(slugPrefix, folderRel, "index")
}

function recordReference(referencedMarkdown, fileRel, metaRel) {
  const existing = referencedMarkdown.get(fileRel)
  if (existing) {
    throw new Error(
      `${docsPath(fileRel)} is referenced by both ${docsPath(existing)} and ${docsPath(metaRel)}`,
    )
  }

  referencedMarkdown.set(fileRel, metaRel)
}

function validateCompleteness(docsRoot, referencedMarkdown, reachedFolders) {
  const files = walk(docsRoot)
  const markdownFolders = new Set([""])
  const metaFolders = new Set()
  const orphanMarkdown = []
  const missingMetaFolders = []
  const orphanMetaFolders = []

  function recordMarkdownFolder(folderRel) {
    let current = folderRel
    while (current) {
      markdownFolders.add(current)
      current = normalizeRel(path.dirname(current))
    }
    markdownFolders.add("")
  }

  for (const file of files) {
    const rel = normalizeRel(path.relative(docsRoot, file))
    const basename = path.basename(file)

    if (path.extname(file).toLowerCase() === ".md") {
      recordMarkdownFolder(normalizeRel(path.dirname(rel)))

      if (basename.toLowerCase() !== "index.md" && !referencedMarkdown.has(rel)) {
        orphanMarkdown.push(rel)
      }
    }

    if (basename === "_meta.json") {
      metaFolders.add(normalizeRel(path.dirname(rel)))
    }
  }

  for (const folderRel of markdownFolders) {
    if (!metaFolders.has(folderRel)) {
      missingMetaFolders.push(folderRel)
    }
  }

  for (const folderRel of metaFolders) {
    if (folderRel && !reachedFolders.has(folderRel)) {
      orphanMetaFolders.push(folderRel)
    }
  }

  if (missingMetaFolders.length > 0) {
    throw new Error(
      "Docs navigation is missing _meta.json manifests:\n" +
        missingMetaFolders
          .sort()
          .map((rel) => `- ${docsPath(posixJoin(rel, "_meta.json"))}`)
          .join("\n"),
    )
  }

  if (orphanMarkdown.length > 0) {
    throw new Error(
      "Docs navigation is missing markdown pages:\n" +
        orphanMarkdown
          .sort()
          .map((rel) => `- ${docsPath(rel)}`)
          .join("\n"),
    )
  }

  if (orphanMetaFolders.length > 0) {
    throw new Error(
      "Docs navigation is missing folders with _meta.json manifests:\n" +
        orphanMetaFolders
          .sort()
          .map((rel) => `- ${docsPath(rel)}`)
          .join("\n"),
    )
  }
}

export function buildDocsNav({
  docsRoot = defaultDocsRoot,
  slugPrefix = defaultDocsSlugPrefix,
} = {}) {
  const resolvedDocsRoot = path.resolve(docsRoot)

  if (!isDirectory(resolvedDocsRoot)) {
    throw new Error(`Could not find docs directory at ${resolvedDocsRoot}`)
  }

  const referencedMarkdown = new Map()
  const reachedFolders = new Set([""])

  function buildFolder(folderRel) {
    const folderPath = path.join(resolvedDocsRoot, folderRel)
    const meta = readMeta(folderPath, folderRel)
    const items = []

    for (const segment of meta.pages) {
      const fileRel = posixJoin(folderRel, `${segment}.md`)
      const childFolderRel = posixJoin(folderRel, segment)
      const filePath = path.join(folderPath, `${segment}.md`)
      const childFolderPath = path.join(folderPath, segment)
      const hasMarkdownFile = isFile(filePath)
      const hasFolder = isDirectory(childFolderPath)
      const metaRel = posixJoin(folderRel, "_meta.json")

      if (hasMarkdownFile && hasFolder) {
        throw new Error(
          `${docsPath(metaRel)} pages entry ${JSON.stringify(
            segment,
          )} is ambiguous because both ${docsPath(fileRel)} and ${docsPath(childFolderRel)} exist`,
        )
      }

      if (!hasMarkdownFile && !hasFolder) {
        throw new Error(
          `${docsPath(metaRel)} pages entry ${JSON.stringify(
            segment,
          )} does not resolve to ${docsPath(fileRel)} or ${docsPath(childFolderRel)}/`,
        )
      }

      if (hasMarkdownFile) {
        recordReference(referencedMarkdown, fileRel, metaRel)
        items.push({
          title: markdownTitle(filePath, fileRel),
          slug: slugForMarkdown(fileRel, slugPrefix),
        })
        continue
      }

      reachedFolders.add(childFolderRel)
      const child = buildFolder(childFolderRel)
      items.push({
        title: child.label,
        slug: slugForFolder(childFolderRel, slugPrefix),
        children: child.items,
      })
    }

    return { label: meta.label, items }
  }

  const root = buildFolder("")
  validateCompleteness(resolvedDocsRoot, referencedMarkdown, reachedFolders)

  return {
    root: {
      title: root.label,
      slug: slugForFolder("", slugPrefix),
    },
    items: root.items,
  }
}
