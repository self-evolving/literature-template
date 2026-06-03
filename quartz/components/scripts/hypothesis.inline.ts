type HypothesisWindow = Window & {
  hypothesisConfig?: () => Record<string, unknown>
}

const scriptId = "hypothesis-embed-script"

function readHypothesisConfig(): Record<string, unknown> | undefined {
  const configElement = document.querySelector<HTMLElement>("[data-hypothesis-config]")
  const rawConfig = configElement?.dataset.hypothesisConfig
  if (!rawConfig) {
    return undefined
  }

  try {
    return JSON.parse(rawConfig) as Record<string, unknown>
  } catch {
    console.warn("Ignoring invalid Hypothesis configuration")
    return undefined
  }
}

function loadHypothesis() {
  const config = readHypothesisConfig()
  if (!config) {
    return
  }

  ;(window as HypothesisWindow).hypothesisConfig = () => config

  if (document.getElementById(scriptId)) {
    return
  }

  const embedScript = document.createElement("script")
  embedScript.id = scriptId
  embedScript.src = "https://hypothes.is/embed.js"
  embedScript.async = true
  document.head.appendChild(embedScript)
}

document.addEventListener("nav", loadHypothesis)
