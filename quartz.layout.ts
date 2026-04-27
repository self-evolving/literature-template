import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.MobileOnly(Component.Darkmode()),
  Component.MobileOnly(Component.Search()),
  Component.DesktopOnly(
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
  ),
  Component.Explorer(),
]

const right = [
  Component.Graph({
    localGraph: { showTags: false },
    globalGraph: { showTags: false },
  }),
  Component.DesktopOnly(Component.TableOfContents()),
  Component.Backlinks(),
]

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ConditionalRender({
      component: Component.ContentMeta({ showReadingTime: false }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.TagList(),
  ],
  left: left.map((component) =>
    Component.ConditionalRender({
      component,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
  right: right.map((component) =>
    Component.ConditionalRender({
      component,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left,
  right: [],
}
