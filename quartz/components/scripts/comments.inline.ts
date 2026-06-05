const getGiscusContainer = () => document.querySelector(".comments .giscus") as GiscusElement | null

const changeTheme = (e: CustomEventMap["themechange"]) => {
  const theme = e.detail.theme
  const iframe = getGiscusContainer()?.querySelector("iframe.giscus-frame") as
    | HTMLIFrameElement
    | undefined
  if (!iframe) {
    return
  }

  if (!iframe.contentWindow) {
    return
  }

  iframe.contentWindow.postMessage(
    {
      giscus: {
        setConfig: {
          theme: getThemeUrl(getThemeName(theme)),
        },
      },
    },
    "https://giscus.app",
  )
}

const getThemeName = (theme: string) => {
  if (theme !== "dark" && theme !== "light") {
    return theme
  }
  const giscusContainer = getGiscusContainer()
  if (!giscusContainer) {
    return theme
  }
  const darkGiscus = giscusContainer.dataset.darkTheme ?? "dark"
  const lightGiscus = giscusContainer.dataset.lightTheme ?? "light"
  return theme === "dark" ? darkGiscus : lightGiscus
}

const absoluteUrlPattern = /^https?:\/\//i

const getThemeRootUrl = (themeRoot: string) => {
  const trimmedThemeRoot = themeRoot.replace(/\/$/, "")

  if (absoluteUrlPattern.test(trimmedThemeRoot)) {
    return trimmedThemeRoot
  }

  if (trimmedThemeRoot.startsWith("//")) {
    return `${window.location.protocol}${trimmedThemeRoot}`
  }

  const themePath = trimmedThemeRoot.startsWith("/") ? trimmedThemeRoot : `/${trimmedThemeRoot}`
  return new URL(themePath, window.location.origin).toString().replace(/\/$/, "")
}

const getThemeUrl = (theme: string) => {
  const giscusContainer = getGiscusContainer()
  if (!giscusContainer) {
    return `https://giscus.app/themes/${theme}.css`
  }

  const themeRoot = giscusContainer.dataset.themeUrl ?? "https://giscus.app/themes"
  return `${getThemeRootUrl(themeRoot)}/${theme}.css`
}

type GiscusElement = Omit<HTMLElement, "dataset"> & {
  dataset: DOMStringMap & {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
    themeUrl: string
    lightTheme: string
    darkTheme: string
    mapping: "url" | "title" | "og:title" | "specific" | "number" | "pathname"
    strict: string
    reactionsEnabled: string
    inputPosition: "top" | "bottom"
    lang: string
    loaded?: string
  }
}

type CommentsDrawerElement = HTMLElement & {
  querySelector<K extends keyof HTMLElementTagNameMap>(
    selectors: K,
  ): HTMLElementTagNameMap[K] | null
  querySelector<E extends Element = Element>(selectors: string): E | null
}

const mountGiscus = (giscusContainer: GiscusElement) => {
  if (giscusContainer.dataset.loaded === "true") {
    return
  }

  giscusContainer.dataset.loaded = "true"
  const giscusScript = document.createElement("script")
  giscusScript.src = "https://giscus.app/client.js"
  giscusScript.async = true
  giscusScript.crossOrigin = "anonymous"
  giscusScript.setAttribute("data-loading", "lazy")
  giscusScript.setAttribute("data-emit-metadata", "0")
  giscusScript.setAttribute("data-repo", giscusContainer.dataset.repo)
  giscusScript.setAttribute("data-repo-id", giscusContainer.dataset.repoId)
  giscusScript.setAttribute("data-category", giscusContainer.dataset.category)
  giscusScript.setAttribute("data-category-id", giscusContainer.dataset.categoryId)
  giscusScript.setAttribute("data-mapping", giscusContainer.dataset.mapping)
  giscusScript.setAttribute("data-strict", giscusContainer.dataset.strict)
  giscusScript.setAttribute("data-reactions-enabled", giscusContainer.dataset.reactionsEnabled)
  giscusScript.setAttribute("data-input-position", giscusContainer.dataset.inputPosition)
  giscusScript.setAttribute("data-lang", giscusContainer.dataset.lang)
  const theme = document.documentElement.getAttribute("saved-theme")
  if (theme) {
    giscusScript.setAttribute("data-theme", getThemeUrl(getThemeName(theme)))
  }

  giscusContainer.appendChild(giscusScript)
}

const drawerWidthStorageKey = "quartz:comments-drawer-width"
const minDrawerWidth = 320
const maxDrawerWidth = 760
const drawerViewportMargin = 16

const maxPanelWidth = () =>
  Math.min(maxDrawerWidth, Math.max(minDrawerWidth, window.innerWidth - drawerViewportMargin))

const clampPanelWidth = (width: number) =>
  Math.min(Math.max(Math.round(width), minDrawerWidth), maxPanelWidth())

const getSavedPanelWidth = () => {
  try {
    const value = Number.parseFloat(localStorage.getItem(drawerWidthStorageKey) ?? "")
    return Number.isFinite(value) ? value : undefined
  } catch {
    return undefined
  }
}

const savePanelWidth = (width: number) => {
  try {
    localStorage.setItem(drawerWidthStorageKey, String(clampPanelWidth(width)))
  } catch {}
}

const setPanelWidth = (panel: HTMLElement, width: number) => {
  const nextWidth = clampPanelWidth(width)
  panel.style.setProperty("--comments-panel-width", `${nextWidth}px`)
  return nextWidth
}

document.addEventListener("nav", () => {
  const drawer = document.querySelector("[data-comments-drawer]") as CommentsDrawerElement | null
  const giscusContainer = getGiscusContainer()
  if (!drawer || !giscusContainer) {
    return
  }

  const trigger = drawer.querySelector<HTMLButtonElement>(".comments-trigger")
  const panel = drawer.querySelector<HTMLElement>(".comments-panel")
  const resizeHandle = drawer.querySelector<HTMLElement>(".comments-resize-handle")
  const closeControls = Array.from(drawer.querySelectorAll<HTMLElement>("[data-comments-close]"))

  if (!trigger || !panel) {
    return
  }

  const savedWidth = getSavedPanelWidth()
  if (savedWidth !== undefined) {
    setPanelWidth(panel, savedWidth)
  }

  let previouslyFocused: HTMLElement | null = null
  let isResizing = false
  let resizeStartX = 0
  let resizeStartWidth = 0
  let activeResizePointerId: number | undefined

  const isOpen = () => drawer.classList.contains("is-open")

  const setOpen = (open: boolean) => {
    drawer.classList.toggle("is-open", open)
    trigger.setAttribute("aria-expanded", open ? "true" : "false")
    panel.setAttribute("aria-hidden", open ? "false" : "true")
    document.body.classList.toggle("comments-drawer-open", open)

    for (const control of closeControls) {
      if (control instanceof HTMLDivElement) {
        control.hidden = !open
      }
    }

    if (open) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      mountGiscus(giscusContainer)
      window.requestAnimationFrame(() => {
        drawer.querySelector<HTMLElement>(".comments-close")?.focus()
      })
    } else if (panel.contains(document.activeElement) && previouslyFocused) {
      previouslyFocused.focus()
    }
  }

  const toggleDrawer = () => setOpen(!isOpen())
  const closeDrawer = () => setOpen(false)

  const resizeToClientX = (clientX: number) => {
    const delta = resizeStartX - clientX
    return setPanelWidth(panel, resizeStartWidth + delta)
  }

  const onResizePointerDown = (event: PointerEvent) => {
    if (!resizeHandle) {
      return
    }

    event.preventDefault()
    isResizing = true
    activeResizePointerId = event.pointerId
    resizeStartX = event.clientX
    resizeStartWidth = panel.getBoundingClientRect().width
    setPanelWidth(panel, resizeStartWidth)
    resizeHandle.setPointerCapture?.(event.pointerId)
    document.body.classList.add("comments-drawer-resizing")
  }

  const onResizePointerMove = (event: PointerEvent) => {
    if (!isResizing || activeResizePointerId !== event.pointerId) {
      return
    }

    resizeToClientX(event.clientX)
  }

  const onResizePointerUp = (event: PointerEvent) => {
    if (!isResizing || activeResizePointerId !== event.pointerId) {
      return
    }

    isResizing = false
    resizeHandle?.releasePointerCapture?.(event.pointerId)
    activeResizePointerId = undefined
    document.body.classList.remove("comments-drawer-resizing")
    savePanelWidth(panel.getBoundingClientRect().width)
  }

  const onResizeKeyDown = (event: KeyboardEvent) => {
    if (!resizeHandle) {
      return
    }

    const currentWidth = panel.getBoundingClientRect().width
    const step = event.shiftKey ? 48 : 16
    let nextWidth: number | undefined

    if (event.key === "ArrowLeft") {
      nextWidth = currentWidth + step
    } else if (event.key === "ArrowRight") {
      nextWidth = currentWidth - step
    } else if (event.key === "Home") {
      nextWidth = minDrawerWidth
    } else if (event.key === "End") {
      nextWidth = maxPanelWidth()
    }

    if (nextWidth === undefined) {
      return
    }

    event.preventDefault()
    savePanelWidth(setPanelWidth(panel, nextWidth))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isOpen()) {
      closeDrawer()
    }
  }

  trigger.addEventListener("click", toggleDrawer)
  resizeHandle?.addEventListener("pointerdown", onResizePointerDown)
  resizeHandle?.addEventListener("keydown", onResizeKeyDown)
  for (const control of closeControls) {
    control.addEventListener("click", closeDrawer)
  }
  document.addEventListener("pointermove", onResizePointerMove)
  document.addEventListener("pointerup", onResizePointerUp)
  document.addEventListener("pointercancel", onResizePointerUp)
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("themechange", changeTheme)

  window.addCleanup(() => {
    trigger.removeEventListener("click", toggleDrawer)
    resizeHandle?.removeEventListener("pointerdown", onResizePointerDown)
    resizeHandle?.removeEventListener("keydown", onResizeKeyDown)
    for (const control of closeControls) {
      control.removeEventListener("click", closeDrawer)
    }
    document.removeEventListener("pointermove", onResizePointerMove)
    document.removeEventListener("pointerup", onResizePointerUp)
    document.removeEventListener("pointercancel", onResizePointerUp)
    document.removeEventListener("keydown", onKeyDown)
    document.removeEventListener("themechange", changeTheme)
    document.body.classList.remove("comments-drawer-open", "comments-drawer-resizing")
  })
})
