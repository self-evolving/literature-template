import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/hypothesis.inline"

export type Options = {
  enabled?: boolean
  openSidebar?: boolean
  showHighlights?: boolean
  theme?: "classic" | "clean"
}

export default ((opts?: Options) => {
  const enabled = opts?.enabled ?? false
  const clientConfig = {
    openSidebar: opts?.openSidebar ?? false,
    showHighlights: opts?.showHighlights ?? true,
    ...(opts?.theme ? { theme: opts.theme } : {}),
  }

  const Hypothesis: QuartzComponent = () => {
    if (!enabled) {
      return <></>
    }

    return (
      <div
        class="hypothesis-config"
        data-hypothesis-config={JSON.stringify(clientConfig)}
        hidden
        aria-hidden="true"
      />
    )
  }

  if (enabled) {
    Hypothesis.afterDOMLoaded = script
  }

  return Hypothesis
}) satisfies QuartzComponentConstructor<Options>
