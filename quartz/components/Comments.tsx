import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import style from "./styles/comments.scss"
// @ts-ignore
import script from "./scripts/comments.inline"

type Options = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
    themeUrl?: string
    lightTheme?: string
    darkTheme?: string
    mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname"
    strict?: boolean
    reactionsEnabled?: boolean
    inputPosition?: "top" | "bottom"
    lang?: string
    triggerMode?: "pill" | "bot"
  }
}

function boolToStringBool(b: boolean): string {
  return b ? "1" : "0"
}

export default ((opts: Options) => {
  const Comments: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // check if comments should be displayed according to frontmatter
    const disableComment: boolean =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (!fileData.frontmatter?.comments || fileData.frontmatter?.comments === "false")
    if (disableComment) {
      return <></>
    }

    const triggerMode = opts.options.triggerMode ?? "pill"

    return (
      <section
        class={classNames(displayClass, "comments", "comments-drawer")}
        data-comments-drawer
        aria-label="Page discussion"
      >
        <button
          class={classNames("comments-trigger", `comments-trigger-${triggerMode}`)}
          type="button"
          aria-controls="comments-drawer-panel"
          aria-expanded="false"
        >
          {triggerMode === "bot" ? (
            <img
              class="comments-trigger-avatar"
              src="/static/sepo-wave-still.webp"
              data-still-src="/static/sepo-wave-still.webp"
              data-wave-src="/static/sepo-wave-loop-16fps.webp"
              alt=""
              aria-hidden="true"
            />
          ) : (
            <svg
              class="comments-trigger-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          )}
          <span class="comments-trigger-label">Chat with Sepo</span>
        </button>
        <div class="comments-backdrop" data-comments-close hidden></div>
        <aside
          class="comments-panel"
          id="comments-drawer-panel"
          role="complementary"
          aria-label="Page discussion"
          aria-hidden="true"
          tabIndex={-1}
        >
          <div
            class="comments-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize discussion drawer"
            tabIndex={0}
          ></div>
          <div class="comments-panel-header">
            <div class="comments-header">
              <h2>Questions or feedback?</h2>
              <p>
                Ask questions, share feedback, or suggest improvements in GitHub Discussions. Please
                feel free to tag <code>@sepo-agent</code>.
              </p>
            </div>
            <button
              class="comments-close"
              type="button"
              data-comments-close
              aria-label="Close discussion"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div class="comments-panel-body">
            <div
              class="giscus"
              data-repo={opts.options.repo}
              data-repo-id={opts.options.repoId}
              data-category={opts.options.category}
              data-category-id={opts.options.categoryId}
              data-mapping={opts.options.mapping ?? "url"}
              data-strict={boolToStringBool(opts.options.strict ?? true)}
              data-reactions-enabled={boolToStringBool(opts.options.reactionsEnabled ?? true)}
              data-input-position={opts.options.inputPosition ?? "bottom"}
              data-light-theme={opts.options.lightTheme ?? "light"}
              data-dark-theme={opts.options.darkTheme ?? "dark"}
              data-theme-url={opts.options.themeUrl ?? "/static/giscus"}
              data-lang={opts.options.lang ?? "en"}
            ></div>
          </div>
        </aside>
      </section>
    )
  }

  Comments.css = style
  Comments.afterDOMLoaded = script

  return Comments
}) satisfies QuartzComponentConstructor<Options>
