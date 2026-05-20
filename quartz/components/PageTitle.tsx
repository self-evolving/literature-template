import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir} aria-label={`${title} Docs`}>
        <span class="site-title-main">{title}</span>
        <span class="site-title-badge">Docs</span>
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.5rem;
  margin: 0;
  font-family: var(--titleFont);
}

.page-title > a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--dark);
  text-decoration: none;
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
