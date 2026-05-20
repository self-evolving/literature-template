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
}

function setupDocsExplorer() {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".docs-nav-toggle")) {
    button.addEventListener("click", toggleDocsNavSection)
    window.addCleanup(() => button.removeEventListener("click", toggleDocsNavSection))
  }
}

document.addEventListener("nav", setupDocsExplorer)
