import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const isDocumentationPage = (slug?: string) =>
  slug === "docs" || slug === "docs/index" || (slug?.startsWith("docs/") ?? false)

const docPageHeader = Component.DocPageHeader()

const docsExplorer = Component.DocsExplorer()

const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.MobileOnly(Component.Darkmode()),
  Component.MobileOnly(Component.Search()),
  Component.DesktopOnly(
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
        { Component: Component.GitHubLink() },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
  ),
  docsExplorer,
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
      component: docPageHeader,
      condition: (page) => isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) =>
        page.fileData.slug !== "index" && !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta({ showReadingTime: false }),
      condition: (page) =>
        page.fileData.slug !== "index" && !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
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
  beforeBody: [
    Component.ConditionalRender({
      component: docPageHeader,
      condition: (page) => isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !isDocumentationPage(page.fileData.slug),
    }),
  ],
  left,
  right: [],
}
