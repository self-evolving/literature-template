const tocCollapsedStateKey = "quartz:toc:collapsed"

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const slug = entry.target.id
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`)
    const windowHeight = entry.rootBounds?.height
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
      } else {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))
      }
    }
  }
})

function readTocCollapsedState() {
  try {
    return localStorage.getItem(tocCollapsedStateKey)
  } catch {
    return null
  }
}

function writeTocCollapsedState(collapsed: boolean) {
  try {
    localStorage.setItem(tocCollapsedStateKey, collapsed ? "true" : "false")
  } catch {
    // Ignore storage failures in private browsing or locked-down contexts.
  }
}

function setTocCollapsed(button: Element, collapsed: boolean) {
  button.classList.toggle("collapsed", collapsed)
  button.setAttribute("aria-expanded", collapsed ? "false" : "true")

  const content = button.nextElementSibling as HTMLElement | undefined
  if (!content) return
  content.classList.toggle("collapsed", collapsed)
}

function toggleToc(this: HTMLElement) {
  const collapsed = !this.classList.contains("collapsed")
  setTocCollapsed(this, collapsed)
  writeTocCollapsedState(collapsed)
}

function setupToc() {
  const savedCollapsedState = readTocCollapsedState()

  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const content = toc.querySelector(".toc-content")
    if (!button || !content) return

    if (savedCollapsedState !== null) {
      setTocCollapsed(button, savedCollapsedState === "true")
    }

    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()

  // update toc entry highlighting
  observer.disconnect()
  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  headers.forEach((header) => observer.observe(header))
})
