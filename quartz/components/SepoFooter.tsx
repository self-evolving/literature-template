import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const QUARTZ_URL = "https://quartz.jzhao.xyz/"
const SEPO_URL = "https://self-evolving.app"

const SepoFooter: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const year = new Date().getFullYear()

  return (
    <footer class={classNames(displayClass, "sepo-footer")}>
      <p>
        Powered by{" "}
        <a href={QUARTZ_URL} target="_blank" rel="noopener noreferrer">
          Quartz
        </a>{" "}
        and{" "}
        <a href={SEPO_URL} target="_blank" rel="noopener noreferrer">
          Sepo
        </a>{" "}
        &copy; {year}
      </p>
    </footer>
  )
}

export default (() => SepoFooter) satisfies QuartzComponentConstructor
