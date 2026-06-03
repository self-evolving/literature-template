#!/usr/bin/env node

import fs from "fs/promises"

const DEFAULT_API_URL = "https://hypothes.is/api/search"
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504])

function parseArgs(argv) {
  const values = new Map()
  const repeated = new Map()

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith("--")) continue

    const [rawName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2)
    const value = inlineValue ?? argv[i + 1]
    if (inlineValue === undefined) i += 1

    if (rawName === "tag") {
      const existing = repeated.get(rawName) ?? []
      existing.push(value)
      repeated.set(rawName, existing)
    } else {
      values.set(rawName, value)
    }
  }

  return { values, repeated }
}

function envValue(name) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : undefined
}

function option(args, name, envName, fallback) {
  const value = args.values.get(name) ?? envValue(envName)
  return value ?? fallback
}

function integerOption(args, name, envName, fallback, min, max) {
  const raw = option(args, name, envName, String(fallback))
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value)
}

function normalizeSiteUrl(value) {
  if (!value) return undefined
  const trimmed = value.trim().replace(/\/$/, "")
  if (trimmed.length === 0) return undefined
  return isHttpUrl(trimmed) ? trimmed : `https://${trimmed}`
}

async function inferSiteUrl() {
  const envSiteUrl =
    normalizeSiteUrl(envValue("SITE_URL")) ??
    normalizeSiteUrl(envValue("VERCEL_PROJECT_PRODUCTION_URL")) ??
    normalizeSiteUrl(envValue("VERCEL_URL"))
  if (envSiteUrl) return envSiteUrl

  try {
    const config = await fs.readFile("quartz.config.yaml", "utf8")
    const match = config.match(/^\s*baseUrl:\s*["']?([^"'\n]+)["']?\s*$/m)
    return normalizeSiteUrl(match?.[1])
  } catch {
    return undefined
  }
}

async function inferWildcardUri(args) {
  const explicit = option(args, "wildcard-uri", "HYPOTHESIS_WILDCARD_URI")
  if (explicit) return explicit

  const siteUrl = await inferSiteUrl()
  return siteUrl ? `${siteUrl}/*` : undefined
}

function splitList(value) {
  if (!value) return []
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildScopeDescription(params) {
  const entries = []
  for (const [key, value] of params.entries()) {
    if (key === "limit" || key === "sort" || key === "order") continue
    entries.push(`${key}=${value}`)
  }
  return entries.length > 0 ? entries.join(", ") : "all authorized annotations"
}

function compactText(value, maxLength = 280) {
  const compact = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength - 3).trimEnd()}...`
}

function escapeMarkdownLinkText(value) {
  return String(value).replace(/[\\[\]]/g, (match) => `\\${match}`)
}

function markdownLinkTarget(value) {
  return `<${String(value).replace(/>/g, "%3E")}>`
}

function annotationTitle(row) {
  const title = row?.document?.title
  if (Array.isArray(title) && title[0]) return compactText(title[0], 120)
  return compactText(row?.uri ?? "Untitled annotation", 120)
}

function annotationQuote(row) {
  const selectors = row?.target?.flatMap((target) => target?.selector ?? []) ?? []
  const quote = selectors.find((selector) => selector?.type === "TextQuoteSelector")?.exact
  return compactText(quote ?? "", 220)
}

function annotationTags(row) {
  return Array.isArray(row?.tags) ? row.tags.filter(Boolean) : []
}

function formatMarkdown(result) {
  if (!result.configured) {
    return [
      "No Hypothesis annotations were fetched because `HYPOTHESIS_API_KEY` is not configured.",
      "Set it in the `agent-literature` environment to include annotation context.",
    ].join("\n")
  }

  const rows = result.rows ?? []
  if (rows.length === 0) {
    return `No Hypothesis annotations found for scope: ${result.scope}.`
  }

  const lines = [
    "## Hypothesis Annotation Context",
    "",
    `Scope: ${result.scope}. Total matches: ${result.total}. Showing ${rows.length}.`,
    "",
  ]

  rows.forEach((row, index) => {
    const title = annotationTitle(row)
    const uri = row.uri ?? ""
    const user = row.user ? `\`${row.user}\`` : "unknown user"
    const updated = row.updated ?? row.created ?? "unknown date"
    const tags = annotationTags(row)
    const quote = annotationQuote(row)
    const note = compactText(row.text ?? "", 320)

    lines.push(`${index + 1}. **[${escapeMarkdownLinkText(title)}](${markdownLinkTarget(uri)})**`)
    lines.push(`   - User/date: ${user}, ${updated}`)
    if (tags.length > 0) {
      lines.push(`   - Tags: ${tags.map((tag) => `\`${tag}\``).join(", ")}`)
    }
    if (quote) {
      lines.push(`   - Selection: ${quote}`)
    }
    if (note) {
      lines.push(`   - Note: ${note}`)
    }
  })

  return lines.join("\n")
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJsonWithRetry(url, token) {
  const attempts = 3

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "literature-template-hypothesis-fetcher",
        },
        signal: controller.signal,
      })

      if (response.ok) {
        return response.json()
      }

      const body = compactText(await response.text(), 500)
      if (attempt < attempts && TRANSIENT_STATUSES.has(response.status)) {
        await sleep(500 * attempt)
        continue
      }

      throw new Error(`Hypothesis API request failed with ${response.status}: ${body}`)
    } catch (error) {
      const isAbort = error?.name === "AbortError"
      const message = error instanceof Error ? error.message : ""
      const isStatusFailure = message.startsWith("Hypothesis API request failed with ")
      if (attempt < attempts && (isAbort || !isStatusFailure)) {
        await sleep(500 * attempt)
        continue
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error("Hypothesis API request failed after retries")
}

async function writeOutput(path, content) {
  if (!path) {
    process.stdout.write(`${content}\n`)
    return
  }

  await fs.writeFile(path, `${content}\n`, "utf8")
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const token = envValue("HYPOTHESIS_API_KEY")
  const format = option(args, "format", "HYPOTHESIS_OUTPUT_FORMAT", "markdown")
  const output = option(args, "output", "HYPOTHESIS_OUTPUT")

  if (!token) {
    const result = { configured: false }
    await writeOutput(
      output,
      format === "json" ? JSON.stringify(result, null, 2) : formatMarkdown(result),
    )
    return
  }

  const apiUrl = option(args, "api-url", "HYPOTHESIS_API_URL", DEFAULT_API_URL)
  const limit = integerOption(args, "limit", "HYPOTHESIS_LIMIT", 12, 1, 50)
  const params = new URLSearchParams({
    limit: String(limit),
    sort: "updated",
    order: "desc",
  })

  const uri = option(args, "uri", "HYPOTHESIS_URI")
  if (uri && isHttpUrl(uri)) {
    params.set("uri", uri)
  } else {
    const wildcardUri = await inferWildcardUri(args)
    if (wildcardUri) params.set("wildcard_uri", wildcardUri)
  }

  const group = option(args, "group", "HYPOTHESIS_GROUP")
  if (group) params.set("group", group)

  const user = option(args, "user", "HYPOTHESIS_USER")
  if (user) params.set("user", user)

  const any = option(args, "any", "HYPOTHESIS_ANY")
  if (any) params.set("any", any)

  for (const tag of [
    ...(args.repeated.get("tag") ?? []),
    ...splitList(envValue("HYPOTHESIS_TAGS")),
  ]) {
    params.append("tag", tag)
  }

  const url = new URL(apiUrl)
  for (const [key, value] of params.entries()) {
    url.searchParams.append(key, value)
  }

  const response = await fetchJsonWithRetry(url, token)
  const rows = Array.isArray(response.rows) ? response.rows : []
  const result = {
    configured: true,
    scope: buildScopeDescription(params),
    total: Number.isFinite(response.total) ? response.total : rows.length,
    rows,
  }

  await writeOutput(
    output,
    format === "json" ? JSON.stringify(result, null, 2) : formatMarkdown(result),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
