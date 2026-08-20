export type TaskTextSegment = { text: string; href?: string }

const markdownLink = /\[([^\]]+)]\(([^\s)]+)\)/g
const bareUrl = /https?:\/\/[^\s<>"']+/g

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

function trimBareUrl(value: string): [string, string] {
  const match = value.match(/^(.*?)([.,!?:;]+)?$/)
  return [match?.[1] ?? value, match?.[2] ?? '']
}

/** Parses only safe HTTP(S) URLs and Markdown links; all other syntax remains text. */
export function parseTaskText(text: string): TaskTextSegment[] {
  const matches: { index: number; length: number; text: string; href?: string }[] = []
  for (const match of text.matchAll(markdownLink)) {
    const label = match[1]
    const destination = match[2]
    if (!label || !destination) continue
    const href = safeHttpUrl(destination)
    if (href) matches.push({ index: match.index!, length: match[0].length, text: label, href })
  }
  for (const match of text.matchAll(bareUrl)) {
    const [url, trailing] = trimBareUrl(match[0])
    const href = safeHttpUrl(url)
    const startsMalformedMarkdownLink = match.index! >= 2 && text.slice(match.index! - 2, match.index!) === ']('
    if (href && !startsMalformedMarkdownLink && !matches.some((link) => match.index! >= link.index && match.index! < link.index + link.length)) {
      matches.push({ index: match.index!, length: url.length, text: url, href })
      if (trailing) matches.push({ index: match.index! + url.length, length: trailing.length, text: trailing })
    }
  }
  matches.sort((a, b) => a.index - b.index)

  const segments: TaskTextSegment[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.index < cursor) continue
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index) })
    segments.push({ text: match.text, href: match.href })
    cursor = match.index + match.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments.length ? segments : [{ text }]
}

/** Formats text for copying, retaining destinations hidden by Markdown labels. */
export function formatTaskTextForClipboard(text: string): string {
  const segments = parseTaskText(text)
  const visible = segments.map((segment) => segment.text).join('')
  const destinations = [...new Set(
    segments.filter((segment) => segment.href && !visible.includes(segment.href)).map((segment) => segment.href!),
  )]
  return destinations.length ? `${visible}\n\nLinks:\n${destinations.join('\n')}` : visible
}
