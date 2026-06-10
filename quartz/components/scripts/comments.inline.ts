type SepoWindow = Window & {
  sepoComments?: {
    setTheme: (theme: string) => void
    open: () => void
    close: () => void
  }
}

const getConfig = () => document.querySelector<HTMLElement>(".sepo-embed")

const themeFor = (cfg: HTMLElement) => {
  const saved = document.documentElement.getAttribute("saved-theme")
  return saved === "dark"
    ? (cfg.dataset.darkTheme ?? "sepo_dark")
    : (cfg.dataset.lightTheme ?? "sepo_light")
}

// Dataset keys forwarded verbatim from the config element onto the sepo.js
// script tag.
const forwardedKeys = [
  "repo",
  "repoId",
  "category",
  "categoryId",
  "mapping",
  "strict",
  "reactionsEnabled",
  "inputPosition",
  "lang",
  "triggerMode",
  "tabs",
  "defaultTab",
  "contentRepo",
  "prNumber",
  "previewPr",
  "previewBranch",
] as const

const mountSepo = (cfg: HTMLElement) => {
  const host = (cfg.dataset.appHost ?? "https://comment-api.sepo.sh").replace(/\/+$/, "")

  // Re-injecting the (cached) script re-runs it; sepo.js tears down any
  // previous embed itself, so this is safe across SPA navigations.
  document.getElementById("sepo-embed-script")?.remove()
  const sepoScript = document.createElement("script")
  sepoScript.id = "sepo-embed-script"
  sepoScript.src = `${host}/sepo.js`
  sepoScript.async = true
  sepoScript.crossOrigin = "anonymous"
  for (const key of forwardedKeys) {
    const value = cfg.dataset[key]
    if (value) {
      sepoScript.dataset[key] = value
    }
  }
  // The site's own light/dark toggle decides the widget theme, not the OS
  // scheme sepo.js would otherwise follow.
  sepoScript.dataset.theme = themeFor(cfg)
  document.head.appendChild(sepoScript)
}

document.addEventListener("nav", () => {
  const cfg = getConfig()
  if (!cfg) {
    return
  }

  mountSepo(cfg)

  const onThemeChange = () => {
    ;(window as SepoWindow).sepoComments?.setTheme(themeFor(cfg))
  }
  document.addEventListener("themechange", onThemeChange)
  window.addCleanup(() => document.removeEventListener("themechange", onThemeChange))
})
