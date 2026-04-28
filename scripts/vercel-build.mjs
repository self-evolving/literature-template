#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import process from "node:process"

const sourceRepository = process.env.SOURCE_REPOSITORY || "self-evolving/repo"
const sourceRef = process.env.SOURCE_REF || "main"
const sourceDir = "source-repo"
const sourceRepoToken = process.env.SOURCE_REPO_TOKEN

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      ...options.env,
    },
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`)
  }
}

function git(args) {
  const gitArgs = sourceRepoToken
    ? [
        "-c",
        `http.https://github.com/.extraheader=AUTHORIZATION: bearer ${sourceRepoToken}`,
        ...args,
      ]
    : args
  run("git", gitArgs)
}

if (!sourceRepoToken) {
  console.warn(
    "SOURCE_REPO_TOKEN is not set. This only works if the source repository is public or already readable in the build environment.",
  )
}

fs.rmSync(sourceDir, { recursive: true, force: true })
fs.mkdirSync(sourceDir, { recursive: true })

console.log(`Fetching ${sourceRepository}@${sourceRef}`)
git(["-C", sourceDir, "init"])
git(["-C", sourceDir, "remote", "add", "origin", `https://github.com/${sourceRepository}.git`])
git(["-C", sourceDir, "fetch", "--depth=1", "origin", sourceRef])
git(["-C", sourceDir, "checkout", "--detach", "FETCH_HEAD"])

run(process.execPath, ["scripts/sync-source-docs.mjs", sourceDir])
run("npx", ["quartz", "build"])
