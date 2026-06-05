import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default ((component: QuartzComponent) => {
  const Component = component
  const DesktopOnly: QuartzComponent = (props: QuartzComponentProps) => {
    return <Component {...props} displayClass="desktop-only" />
  }

  DesktopOnly.displayName = component.displayName
  DesktopOnly.afterDOMLoaded = component?.afterDOMLoaded
  DesktopOnly.beforeDOMLoaded = component?.beforeDOMLoaded
  DesktopOnly.css = component?.css
  return DesktopOnly
}) satisfies QuartzComponentConstructor<QuartzComponent>
