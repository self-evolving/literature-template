const defaultOptions = {
  papersRoot: "papers",
}

function decodeCitekey(rawCitekey) {
  try {
    return decodeURIComponent(rawCitekey)
  } catch {
    return rawCitekey
  }
}

function slugifyCitationKey(citekey) {
  return citekey
    .trim()
    .replace(/^@+/, "")
    .replace(/[\\/]+/g, "-")
    .replace(/\s/g, "-")
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .toLowerCase()
}

function stripSlashes(value) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "")
}

function joinSegments(...segments) {
  const joined = segments
    .filter((segment) => segment && segment !== "/")
    .map((segment) => stripSlashes(String(segment)))
    .filter(Boolean)
    .join("/")

  return joined.length > 0 ? joined : "."
}

function pathToRoot(slug) {
  const parentSegments = String(slug ?? "")
    .split("/")
    .filter(Boolean)
    .slice(0, -1)

  return parentSegments.length === 0 ? "." : parentSegments.map(() => "..").join("/")
}

function addClasses(existing, classesToAdd) {
  const classes = Array.isArray(existing)
    ? existing
    : typeof existing === "string"
      ? existing.split(/\s+/).filter(Boolean)
      : []

  for (const className of classesToAdd) {
    if (!classes.includes(className)) {
      classes.push(className)
    }
  }

  return classes
}

function addOutgoingLink(file, targetSlug) {
  if (file.data.slug === targetSlug) {
    return
  }

  const existingLinks = Array.isArray(file.data.links) ? file.data.links : []
  file.data.links = [...new Set([...existingLinks, targetSlug])]
}

function citationTarget(citekey, papersRoot) {
  const slug = slugifyCitationKey(citekey)
  if (slug.length === 0) {
    return undefined
  }

  return joinSegments(papersRoot, slug)
}

export function LiteratureCitations(userOptions = {}) {
  const options = { ...defaultOptions, ...userOptions }
  const papersRoot = stripSlashes(options.papersRoot ?? defaultOptions.papersRoot)

  return {
    name: "LiteratureCitations",
    htmlPlugins(ctx) {
      return [
        () => (tree, file) => {
          const visit = (node) => {
            if (!node || typeof node !== "object") {
              return
            }

            if (node.type === "element" && node.tagName === "a") {
              const properties = (node.properties ??= {})
              const href = typeof properties.href === "string" ? properties.href : undefined
              const match = href?.match(/^#bib-(.+)$/)

              if (match) {
                const citekey = decodeCitekey(match[1])
                const targetSlug = citationTarget(citekey, papersRoot)
                const hasPaperNote = targetSlug && ctx.allSlugs.includes(targetSlug)

                if (hasPaperNote) {
                  properties.href = joinSegments(pathToRoot(file.data.slug), targetSlug)
                  properties.className = addClasses(properties.className, [
                    "internal",
                    "internal-link",
                    "citation-paper-link",
                  ])
                  properties["data-slug"] = targetSlug
                  properties["data-citekey"] = citekey
                  properties["data-bib-href"] = href
                  properties.title = `Open paper note for ${citekey}`
                  delete properties["data-no-popover"]
                  delete properties.dataNoPopover

                  addOutgoingLink(file, targetSlug)
                }
              }
            }

            if (Array.isArray(node.children)) {
              for (const child of node.children) {
                visit(child)
              }
            }
          }

          visit(tree)
        },
      ]
    },
  }
}

export default LiteratureCitations
