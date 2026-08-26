/**
 * Small, deliberately restrictive Markdown renderer for What-to-Expect reports.
 *
 * Security: the input is escaped FIRST, then a fixed set of block and inline
 * constructs is re-introduced. Raw HTML in the source is therefore inert, which
 * matters because report content is admin-editable free text that is rendered
 * into the client portal.
 *
 * Supported: h1-h4, unordered lists, blockquotes, horizontal rules,
 * paragraphs, **bold**, _italic_, `code`.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>");
}

/**
 * @param baseLevel Heading level that a top-level "#" maps to. The client
 *   portal and the admin preview embed the report inside a page that already
 *   has an <h1>, so they pass 2 to keep one h1 per document.
 */
export function renderMarkdown(source: string, baseLevel = 1): string {
  const lines = escapeHtml(source ?? "").split(/\r?\n/);
  const out: string[] = [];
  let listOpen = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push("<hr />");
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length + baseLevel - 1);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(line.trim());
    if (listItem) {
      flushParagraph();
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inline(listItem[1].trim())}</li>`);
      continue;
    }

    const quote = /^&gt;\s+(.*)$/.exec(line.trim());
    if (quote) {
      flushParagraph();
      closeList();
      out.push(`<blockquote><p>${inline(quote[1].trim())}</p></blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return out.join("\n");
}

/** Plain-text excerpt, used for list previews. */
export function markdownExcerpt(source: string, maxLength = 180): string {
  const text = (source ?? "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
