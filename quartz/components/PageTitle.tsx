import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a class="site-title-link" href={baseDir} aria-label={`${title} Docs`}>
        <span class="site-title-main">{title}</span>
        <span class="site-title-badge">Docs</span>
      </a>
      <a
        class="page-title-github"
        href="https://github.com/self-evolving/repo"
        aria-label="View Sepo on GitHub"
        title="View Sepo on GitHub"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.67 7.67 0 0 1 8 3.36c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 1.5rem;
  margin: 0;
  font-family: var(--titleFont);
}

.site-title-link {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 0.45rem;
  color: var(--dark);
  text-decoration: none;
}

.page-title-github {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 1.65rem;
  height: 1.65rem;
  color: var(--darkgray);
  background: transparent;
  border-radius: 7px;
  opacity: 0.68;
  text-decoration: none;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

.page-title-github:hover {
  background: var(--lightgray);
  color: var(--dark);
  opacity: 1;
}

.page-title-github > svg {
  width: 17px;
  height: 17px;
}

.site-title-main {
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1;
}

.site-title-badge {
  display: inline-flex;
  align-items: center;
  height: 1.05rem;
  padding: 0 0.38rem;
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  color: var(--darkgray);
  background: var(--light);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  text-transform: uppercase;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
