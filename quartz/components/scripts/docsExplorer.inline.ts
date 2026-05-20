const docsExplorerStateKey = "quartz:docs-explorer:sections"

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
}

document.addEventListener("nav", setupDocsExplorer)
