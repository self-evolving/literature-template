import fs from "node:fs"
import path from "node:path"
import { minimatch } from "minimatch"

export const defaultDocsRoot = "content"
export const defaultDocsSlugPrefix = ""

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

const minimatchOptions = { dot: true }

function isMetaFile(rel) {
  return rel.split("/").pop() === "_meta.json"
}

function hasGlobMagic(pattern) {
  return /[*?[\]{}()!+@]/.test(pattern)
}

function normalizeIgnorePattern(pattern) {
  return toPosix(pattern).replace(/^\.\//, "")
}

function matchesIgnorePattern(rel, pattern) {
  if (!pattern) {
    return false
  }

  if (minimatch(rel, pattern, minimatchOptions)) {
    return true
  }

  if (!hasGlobMagic(pattern)) {
    return rel === pattern || rel.startsWith(`${pattern}/`)
  }

  return false
}

function shouldIgnorePath(rel, ignorePatterns) {
  if (!rel) {
    return false
  }

  return ignorePatterns.some((rawPattern) => {
    const pattern = normalizeIgnorePattern(rawPattern)

    // Quartz ignores _meta.json as publishable content, but the custom navigation
    // needs those manifests for every visible folder.
    if (isMetaFile(rel) && pattern.includes("_meta.json")) {
      return false
    }

    return matchesIgnorePattern(rel, pattern)
  })
}

function docsRootLabel(docsRoot) {
  const relative = normalizeRel(path.relative(process.cwd(), docsRoot))

  if (relative && relative !== ".." && !relative.startsWith("../") && !path.isAbsolute(relative)) {
    return relative
  }

  return toPosix(docsRoot)
}

function docsPath(rel, rootLabel) {
  const root = toPosix(rootLabel)
  return rel ? `${root}/${rel}` : root
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

function walk(dir, rootDir = dir, ignorePatterns = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    const rel = normalizeRel(path.relative(rootDir, absPath))

    if (shouldIgnorePath(rel, ignorePatterns)) {
      continue
    }

    if (entry.isDirectory()) {
      files.push(...walk(absPath, rootDir, ignorePatterns))
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

function markdownTitle(filePath, fileRel, rootLabel) {
  const markdown = fs.readFileSync(filePath, "utf8")
  const match = frontmatterMatch(markdown)
  const titleMatch = match?.[1]?.match(/^title\s*:\s*(.+?)\s*$/m)

  if (!titleMatch) {
    throw new Error(`${docsPath(fileRel, rootLabel)} must define frontmatter with a title field`)
  }

  let title
  try {
    title = unquoteYamlString(titleMatch[1])
  } catch (error) {
    throw new Error(`Could not parse title in ${docsPath(fileRel, rootLabel)}: ${error.message}`)
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error(
      `${docsPath(fileRel, rootLabel)} must define frontmatter with a non-empty title field`,
    )
  }

  return title.trim()
}

function validatePageSegment(segment, metaRel, rootLabel) {
  if (typeof segment !== "string") {
    throw new Error(`${docsPath(metaRel, rootLabel)} pages entries must be strings`)
  }

  if (segment.trim() !== segment || segment.length === 0) {
    throw new Error(
      `${docsPath(metaRel, rootLabel)} has an invalid pages entry ${JSON.stringify(segment)}`,
    )
  }

  if (segment === "index") {
    throw new Error(`${docsPath(metaRel, rootLabel)} must not list index; index.md is implicit`)
  }

  if (segment.endsWith(".md")) {
    throw new Error(
      `${docsPath(metaRel, rootLabel)} pages entry ${JSON.stringify(segment)} must omit .md`,
    )
  }

  if (segment.includes("/") || segment.includes("\\") || segment === "." || segment === "..") {
    throw new Error(
      `${docsPath(metaRel, rootLabel)} pages entry ${JSON.stringify(
        segment,
      )} must be a single slug segment`,
    )
  }
}

function readMeta(folderPath, folderRel, rootLabel) {
  const metaRel = posixJoin(folderRel, "_meta.json")
  const metaPath = path.join(folderPath, "_meta.json")

  if (!isFile(metaPath)) {
    throw new Error(`${docsPath(metaRel, rootLabel)} is required for navigation`)
  }

  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(metaPath, "utf8"))
  } catch (error) {
    throw new Error(`Could not parse ${docsPath(metaRel, rootLabel)}: ${error.message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${docsPath(metaRel, rootLabel)} must be a JSON object`)
  }

  const { label, pages } = parsed
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error(`${docsPath(metaRel, rootLabel)} must define a non-empty label string`)
  }

  if (!Array.isArray(pages)) {
    throw new Error(`${docsPath(metaRel, rootLabel)} must define a pages array`)
  }

  const seen = new Set()
  for (const segment of pages) {
    validatePageSegment(segment, metaRel, rootLabel)

    if (seen.has(segment)) {
      throw new Error(
        `${docsPath(metaRel, rootLabel)} lists ${JSON.stringify(segment)} more than once`,
      )
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

function recordReference(referencedMarkdown, fileRel, metaRel, rootLabel) {
  const existing = referencedMarkdown.get(fileRel)
  if (existing) {
    throw new Error(
      `${docsPath(fileRel, rootLabel)} is referenced by both ${docsPath(
        existing,
        rootLabel,
      )} and ${docsPath(metaRel, rootLabel)}`,
    )
  }

  referencedMarkdown.set(fileRel, metaRel)
}

function validateCompleteness(
  docsRoot,
  referencedMarkdown,
  reachedFolders,
  rootLabel,
  ignorePatterns,
) {
  const files = walk(docsRoot, docsRoot, ignorePatterns)
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
      "Navigation is missing _meta.json manifests:\n" +
        missingMetaFolders
          .sort()
          .map((rel) => `- ${docsPath(posixJoin(rel, "_meta.json"), rootLabel)}`)
          .join("\n"),
    )
  }

  if (orphanMarkdown.length > 0) {
    throw new Error(
      "Navigation is missing markdown pages:\n" +
        orphanMarkdown
          .sort()
          .map((rel) => `- ${docsPath(rel, rootLabel)}`)
          .join("\n"),
    )
  }

  if (orphanMetaFolders.length > 0) {
    throw new Error(
      "Navigation is missing folders with _meta.json manifests:\n" +
        orphanMetaFolders
          .sort()
          .map((rel) => `- ${docsPath(rel, rootLabel)}`)
          .join("\n"),
    )
  }
}

export function buildDocsNav({
  docsRoot = defaultDocsRoot,
  slugPrefix = defaultDocsSlugPrefix,
  ignorePatterns = [],
} = {}) {
  const resolvedDocsRoot = path.resolve(docsRoot)
  const rootLabel = docsRootLabel(resolvedDocsRoot)

  if (!isDirectory(resolvedDocsRoot)) {
    throw new Error(`Could not find navigation root at ${rootLabel} (${resolvedDocsRoot})`)
  }

  const referencedMarkdown = new Map()
  const reachedFolders = new Set([""])

  function buildFolder(folderRel) {
    const folderPath = path.join(resolvedDocsRoot, folderRel)
    const meta = readMeta(folderPath, folderRel, rootLabel)
    const items = []

    for (const segment of meta.pages) {
      const fileRel = posixJoin(folderRel, `${segment}.md`)
      const childFolderRel = posixJoin(folderRel, segment)
      const filePath = path.join(folderPath, `${segment}.md`)
      const childFolderPath = path.join(folderPath, segment)
      const hasMarkdownFile = isFile(filePath) && !shouldIgnorePath(fileRel, ignorePatterns)
      const hasFolder =
        isDirectory(childFolderPath) && !shouldIgnorePath(childFolderRel, ignorePatterns)
      const metaRel = posixJoin(folderRel, "_meta.json")

      if (hasMarkdownFile && hasFolder) {
        throw new Error(
          `${docsPath(metaRel, rootLabel)} pages entry ${JSON.stringify(
            segment,
          )} is ambiguous because both ${docsPath(fileRel, rootLabel)} and ${docsPath(
            childFolderRel,
            rootLabel,
          )} exist`,
        )
      }

      if (!hasMarkdownFile && !hasFolder) {
        throw new Error(
          `${docsPath(metaRel, rootLabel)} pages entry ${JSON.stringify(
            segment,
          )} does not resolve to ${docsPath(fileRel, rootLabel)} or ${docsPath(
            childFolderRel,
            rootLabel,
          )}/`,
        )
      }

      if (hasMarkdownFile) {
        recordReference(referencedMarkdown, fileRel, metaRel, rootLabel)
        items.push({
          title: markdownTitle(filePath, fileRel, rootLabel),
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
  validateCompleteness(
    resolvedDocsRoot,
    referencedMarkdown,
    reachedFolders,
    rootLabel,
    ignorePatterns,
  )

  return {
    root: {
      title: root.label,
      slug: slugForFolder("", slugPrefix),
    },
    items: root.items,
  }
}
