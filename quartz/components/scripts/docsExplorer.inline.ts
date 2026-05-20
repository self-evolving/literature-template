const docsExplorerStateKey = "quartz:docs-explorer:sections"
const docsExplorerScrollKey = "quartz:docs-explorer:scrollTop"

type DocsExplorerState = Record<string, boolean>

function readDocsExplorerState(): DocsExplorerState {
  try {
    return JSON.parse(localStorage.getItem(docsExplorerStateKey) ?? "{}")
  } catch {
    return {}
  }
}

function writeDocsExplorerState(state: DocsExplorerState) {
  try {
    localStorage.setItem(docsExplorerStateKey, JSON.stringify(state))
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }
}

function getDocsExplorer() {
  return document.querySelector<HTMLElement>(".docs-explorer")
}

function readDocsExplorerScrollTop() {
  try {
    const scrollTop = Number.parseFloat(sessionStorage.getItem(docsExplorerScrollKey) ?? "")
    return Number.isFinite(scrollTop) ? scrollTop : undefined
  } catch {
    return undefined
  }
}

function writeDocsExplorerScrollTop(scrollTop: number) {
  try {
    sessionStorage.setItem(docsExplorerScrollKey, String(scrollTop))
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }
}

function saveDocsExplorerScroll() {
  const explorer = getDocsExplorer()
  if (!explorer) return

  writeDocsExplorerScrollTop(explorer.scrollTop)
}

function restoreDocsExplorerScroll() {
  const explorer = getDocsExplorer()
  const scrollTop = readDocsExplorerScrollTop()
  if (!explorer || scrollTop === undefined) return

  requestAnimationFrame(() => {
    explorer.scrollTop = scrollTop
  })
}

function docsNavSectionKey(button: HTMLButtonElement) {
  return button.getAttribute("aria-controls") ?? button.dataset.title ?? ""
}

function setDocsNavSectionState(button: HTMLButtonElement, expanded: boolean) {
  const controls = button.getAttribute("aria-controls")
  const content = controls ? document.getElementById(controls) : undefined
  const title = button.dataset.title ?? "section"
  const section = button.closest(".docs-nav-section")

  button.setAttribute("aria-expanded", expanded ? "true" : "false")
  button.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${title}`)
  content?.toggleAttribute("hidden", !expanded)
  section?.classList.toggle("expanded", expanded)
  section?.classList.toggle("collapsed", !expanded)
}

function toggleDocsNavSection(this: HTMLButtonElement) {
  const expanded = this.getAttribute("aria-expanded") !== "true"
  setDocsNavSectionState(this, expanded)

  const key = docsNavSectionKey(this)
  if (!key) return

  const state = readDocsExplorerState()
  state[key] = expanded
  writeDocsExplorerState(state)
}

function setupDocsExplorer() {
  const state = readDocsExplorerState()

  for (const button of document.querySelectorAll<HTMLButtonElement>(".docs-nav-section-button")) {
    const key = docsNavSectionKey(button)
    if (key && state[key] !== undefined) {
      setDocsNavSectionState(button, state[key])
    }

    button.addEventListener("click", toggleDocsNavSection)
    window.addCleanup(() => button.removeEventListener("click", toggleDocsNavSection))
  }

  const explorer = getDocsExplorer()
  if (explorer) {
    explorer.addEventListener("scroll", saveDocsExplorerScroll, { passive: true })
    window.addCleanup(() => explorer.removeEventListener("scroll", saveDocsExplorerScroll))
  }

  restoreDocsExplorerScroll()
}

document.addEventListener("prenav", saveDocsExplorerScroll)
document.addEventListener("nav", setupDocsExplorer)
