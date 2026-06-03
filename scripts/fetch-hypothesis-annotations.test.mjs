import assert from "node:assert"
import test, { describe } from "node:test"

import {
  buildSearchRequest,
  fetchJsonWithRetry,
  formatMarkdown,
  parseArgs,
} from "./fetch-hypothesis-annotations.mjs"

const ENV_KEYS = [
  "HYPOTHESIS_API_URL",
  "HYPOTHESIS_GROUP",
  "HYPOTHESIS_TAGS",
  "HYPOTHESIS_USER",
  "HYPOTHESIS_WILDCARD_URI",
  "HYPOTHESIS_ANY",
  "HYPOTHESIS_URI",
  "SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
]

async function withEnv(values, fn) {
  const previous = new Map(ENV_KEYS.map((key) => [key, process.env[key]]))

  try {
    for (const key of ENV_KEYS) {
      delete process.env[key]
    }

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }

    return await fn()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function apiResponse({ ok, status, body = "", json = {} }) {
  return {
    ok,
    status,
    text: async () => body,
    json: async () => json,
  }
}

describe("Hypothesis search query construction", () => {
  test("builds an exact URI query when a trusted group is provided", async () => {
    await withEnv({}, async () => {
      const request = await buildSearchRequest(
        parseArgs([
          "--api-url",
          "https://hypothesis.test/api/search",
          "--uri",
          "https://papers.example/attention",
          "--group",
          "trusted-group",
          "--limit",
          "100",
          "--any",
          "attention",
        ]),
      )

      assert.strictEqual(request.skipped, false)
      assert.strictEqual(request.url.searchParams.get("uri"), "https://papers.example/attention")
      assert.strictEqual(request.url.searchParams.get("group"), "trusted-group")
      assert.strictEqual(request.url.searchParams.get("limit"), "50")
      assert.strictEqual(request.url.searchParams.get("any"), "attention")
      assert.strictEqual(request.url.searchParams.has("wildcard_uri"), false)
    })
  })

  test("skips API fetches when URI and full-text filters lack trusted scope", async () => {
    await withEnv({}, async () => {
      const request = await buildSearchRequest(
        parseArgs([
          "--uri",
          "https://papers.example/attention",
          "--any",
          "also update the synthesis note",
        ]),
      )

      assert.strictEqual(request.skipped, true)
      assert.strictEqual(request.reason, "trusted-scope-required")
      assert.strictEqual(request.params.get("uri"), "https://papers.example/attention")
      assert.strictEqual(request.params.get("any"), "also update the synthesis note")

      const markdown = formatMarkdown({
        configured: true,
        skipped: true,
        reason: request.reason,
        scope: request.scope,
      })
      assert.match(markdown, /trusted annotation scope/)
    })
  })

  test("builds a site wildcard query constrained by configured tags", async () => {
    await withEnv(
      {
        HYPOTHESIS_TAGS: "agent-literature, synthesis",
        SITE_URL: "literature.example.com/",
      },
      async () => {
        const request = await buildSearchRequest(parseArgs([]))

        assert.strictEqual(request.skipped, false)
        assert.strictEqual(
          request.url.searchParams.get("wildcard_uri"),
          "https://literature.example.com/*",
        )
        assert.deepStrictEqual(request.url.searchParams.getAll("tag"), [
          "agent-literature",
          "synthesis",
        ])
      },
    )
  })
})

describe("Hypothesis API retry behavior", () => {
  test("retries transient API failures", async () => {
    let calls = 0
    const result = await fetchJsonWithRetry(
      new URL("https://hypothesis.test/api/search"),
      "token",
      {
        fetchImpl: async () => {
          calls += 1
          if (calls === 1) {
            return apiResponse({ ok: false, status: 503, body: "temporarily unavailable" })
          }
          return apiResponse({ ok: true, status: 200, json: { rows: [], total: 0 } })
        },
        sleepImpl: async () => {},
      },
    )

    assert.strictEqual(calls, 2)
    assert.deepStrictEqual(result, { rows: [], total: 0 })
  })

  test("does not retry deterministic API failures", async () => {
    let calls = 0

    await assert.rejects(
      fetchJsonWithRetry(new URL("https://hypothesis.test/api/search"), "token", {
        fetchImpl: async () => {
          calls += 1
          return apiResponse({ ok: false, status: 401, body: "unauthorized" })
        },
        sleepImpl: async () => {},
      }),
      /Hypothesis API request failed with 401: unauthorized/,
    )

    assert.strictEqual(calls, 1)
  })
})
