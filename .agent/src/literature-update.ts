export interface LiteratureUpdateParts {
  body: string;
  comments: string[];
}

const COMMENT_BLOCK_PATTERN =
  /<!--\s*literature-item-comment\s*-->([\s\S]*?)<!--\s*\/literature-item-comment\s*-->/gi;
const FIRST_COMMENT_MARKER_PATTERN = /<!--\s*literature-item-comment\s*-->/i;
const TRAILING_ITEM_COMMENTS_HEADING_PATTERN = /(?:\n|^)##\s+Item Comments\s*$/i;

function normalizeMarkdownBlock(value: string): string {
  return value.trim().replace(/\n{3,}/g, "\n\n");
}

export function parseLiteratureUpdate(raw: string): LiteratureUpdateParts {
  const text = String(raw || "").trim();
  if (!text) {
    return { body: "", comments: [] };
  }

  const comments: string[] = [];
  for (const match of text.matchAll(COMMENT_BLOCK_PATTERN)) {
    const comment = normalizeMarkdownBlock(match[1] || "");
    if (comment) {
      comments.push(comment);
    }
  }

  const firstCommentMatch = FIRST_COMMENT_MARKER_PATTERN.exec(text);
  const bodySource = firstCommentMatch ? text.slice(0, firstCommentMatch.index) : text;
  const body = normalizeMarkdownBlock(
    bodySource.replace(TRAILING_ITEM_COMMENTS_HEADING_PATTERN, ""),
  );

  return { body, comments };
}
