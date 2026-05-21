import { promises as fs } from "fs"
import { FontWeight, SatoriOptions } from "satori/wasm"
import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { JSXInternal } from "preact/src/jsx"
import { FontSpecification, getFontSpecificationName, ThemeKey } from "./theme"
import path from "path"
import { QUARTZ } from "./path"
import { styleText } from "util"

const defaultHeaderWeight = [700]
const defaultBodyWeight = [400]

export async function getSatoriFonts(headerFont: FontSpecification, bodyFont: FontSpecification) {
  // Get all weights for header and body fonts
  const headerWeights: FontWeight[] = (
    typeof headerFont === "string"
      ? defaultHeaderWeight
      : (headerFont.weights ?? defaultHeaderWeight)
  ) as FontWeight[]
  const bodyWeights: FontWeight[] = (
    typeof bodyFont === "string" ? defaultBodyWeight : (bodyFont.weights ?? defaultBodyWeight)
  ) as FontWeight[]

  const headerFontName = typeof headerFont === "string" ? headerFont : headerFont.name
  const bodyFontName = typeof bodyFont === "string" ? bodyFont : bodyFont.name

  // Fetch fonts for all weights and convert to satori format in one go
  const headerFontPromises = headerWeights.map(async (weight) => {
    const data = await fetchTtf(headerFontName, weight)
    if (!data) return null
    return {
      name: headerFontName,
      data,
      weight,
      style: "normal" as const,
    }
  })

  const bodyFontPromises = bodyWeights.map(async (weight) => {
    const data = await fetchTtf(bodyFontName, weight)
    if (!data) return null
    return {
      name: bodyFontName,
      data,
      weight,
      style: "normal" as const,
    }
  })

  const [headerFonts, bodyFonts] = await Promise.all([
    Promise.all(headerFontPromises),
    Promise.all(bodyFontPromises),
  ])

  // Filter out any failed fetches and combine header and body fonts
  const fonts: SatoriOptions["fonts"] = [
    ...headerFonts.filter((font): font is NonNullable<typeof font> => font !== null),
    ...bodyFonts.filter((font): font is NonNullable<typeof font> => font !== null),
  ]

  return fonts
}

/**
 * Get the `.ttf` file of a google font
 * @param fontName name of google font
 * @param weight what font weight to fetch font
 * @returns `.ttf` file of google font
 */
export async function fetchTtf(
  rawFontName: string,
  weight: FontWeight,
): Promise<Buffer<ArrayBufferLike> | undefined> {
  const fontName = rawFontName.replaceAll(" ", "+")
  const cacheKey = `${fontName}-${weight}`
  const cacheDir = path.join(QUARTZ, ".quartz-cache", "fonts")
  const cachePath = path.join(cacheDir, cacheKey)

  // Check if font exists in cache
  try {
    await fs.access(cachePath)
    return fs.readFile(cachePath)
  } catch (error) {
    // ignore errors and fetch font
  }

  // Get css file from google fonts
  const cssResponse = await fetch(
    `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weight}`,
  )
  const css = await cssResponse.text()

  // Extract .ttf url from css file
  const urlRegex = /url\((https:\/\/fonts.gstatic.com\/s\/.*?.ttf)\)/g
  const match = urlRegex.exec(css)

  if (!match) {
    console.log(
      styleText(
        "yellow",
        `\nWarning: Failed to fetch font ${rawFontName} with weight ${weight}, got ${cssResponse.statusText}`,
      ),
    )
    return
  }

  // fontData is an ArrayBuffer containing the .ttf file data
  const fontResponse = await fetch(match[1])
  const fontData = Buffer.from(await fontResponse.arrayBuffer())
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(cachePath, fontData)

  return fontData
}

export type SocialImageOptions = {
  /**
   * What color scheme to use for image generation (uses colors from config theme)
   */
  colorScheme: ThemeKey
  /**
   * Height to generate image with in pixels (should be around 630px)
   */
  height: number
  /**
   * Width to generate image with in pixels (should be around 1200px)
   */
  width: number
  /**
   * Whether to use the auto generated image for the root path ("/", when set to false) or the default og image (when set to true).
   */
  excludeRoot: boolean
  /**
   * JSX to use for generating image. See satori docs for more info (https://github.com/vercel/satori)
   */
  imageStructure: (
    options: ImageOptions & {
      userOpts: UserOpts
      iconBase64?: string
      backgroundBase64?: string
    },
  ) => JSXInternal.Element
}

export type UserOpts = Omit<SocialImageOptions, "imageStructure">

export type ImageOptions = {
  /**
   * what title to use as header in image
   */
  title: string
  /**
   * what description to use as body in image
   */
  description: string
  /**
   * header + body font to be used when generating satori image (as promise to work around sync in component)
   */
  fonts: SatoriOptions["fonts"]
  /**
   * `GlobalConfiguration` of quartz (used for theme/typography)
   */
  cfg: GlobalConfiguration
  /**
   * full file data of current page
   */
  fileData: QuartzPluginData
}

// This is the default template for generated social image.
export const defaultImage: SocialImageOptions["imageStructure"] = ({
  cfg,
  userOpts,
  title,
  description,
  fileData,
  backgroundBase64,
}) => {
  const { colorScheme } = userOpts
  const colors = cfg.theme.colors[colorScheme]
  const bodyFont = getFontSpecificationName(cfg.theme.typography.body)
  const headerFont = getFontSpecificationName(cfg.theme.typography.header)
  const titleLength = title.length
  const titleFontSize = titleLength > 58 ? 50 : titleLength > 38 ? 58 : 66
  const descriptionFontSize = description.length > 180 ? 26 : 30
  const isDocsPage = fileData.slug === "docs" || fileData.slug === "docs/index"
  const eyebrow = isDocsPage ? "self-evolving.app" : `${cfg.baseUrl ?? "self-evolving.app"}`
  const chips = ["GitHub-native", "Agent workflows", "Repo memory"]

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: colors.light,
        fontFamily: bodyFont,
      }}
    >
      {backgroundBase64 ? (
        <img
          src={backgroundBase64}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.lightgray} 100%)`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 74,
          top: 66,
          display: "flex",
          flexDirection: "column",
          width: 740,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: colors.darkgray,
            fontSize: 24,
            fontFamily: bodyFont,
            letterSpacing: "-0.01em",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 11,
              height: 11,
              borderRadius: 999,
              backgroundColor: colors.secondary,
            }}
          />
          <span>{eyebrow}</span>
        </div>

        <h1
          style={{
            display: "flex",
            margin: "38px 0 0",
            color: colors.dark,
            fontFamily: headerFont,
            fontSize: titleFontSize,
            fontWeight: 700,
            letterSpacing: "-0.055em",
            lineHeight: 1.03,
            maxWidth: 760,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            display: "flex",
            margin: "26px 0 0",
            color: colors.darkgray,
            fontFamily: bodyFont,
            fontSize: descriptionFontSize,
            lineHeight: 1.36,
            maxWidth: 710,
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
          }}
        >
          {chips.map((chip) => (
            <div
              style={{
                display: "flex",
                padding: "10px 15px",
                border: `1px solid ${colors.lightgray}`,
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.72)",
                color: colors.secondary,
                fontFamily: bodyFont,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 74,
          bottom: 64,
          display: "flex",
          color: colors.gray,
          fontFamily: bodyFont,
          fontSize: 22,
          letterSpacing: "-0.01em",
        }}
      >
        Open-source agent workflows for repositories that evolve.
      </div>
    </div>
  )
}
