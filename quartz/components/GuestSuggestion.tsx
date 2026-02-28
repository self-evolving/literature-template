import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

export default (() => {
  const GuestSuggestion: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const guestLink = resolveRelative(fileData.slug!, "guest-criteria")
    return (
      <p class="guest-suggestion">
        Have a suggestion for a guest? Check out our{" "}
        <a href={guestLink}>guest criteria</a> or{" "}
        <a href="https://forms.gle/ZYE4mEZ5PXA68ZubA" target="_blank" rel="noopener noreferrer">
          submit a suggestion
        </a>
        .
      </p>
    )
  }

  GuestSuggestion.css = `
.guest-suggestion {
  margin: 1rem 0;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--gray);

  a {
    color: var(--secondary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
`
  return GuestSuggestion
}) satisfies QuartzComponentConstructor
