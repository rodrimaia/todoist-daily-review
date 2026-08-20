import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { formatTaskTextForClipboard, parseTaskText } from '~/lib/task-information'

type CopyState = 'idle' | 'success' | 'error'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(text)
    return true
  } catch {
    // Some HTTP and older browser contexts still permit execCommand copying.
  }

  const activeElement = document.activeElement as HTMLElement | null
  const selection = window.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : []
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  document.body.append(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  textarea.remove()
  if (selection) {
    selection.removeAllRanges()
    ranges.forEach((range) => selection.addRange(range))
  }
  activeElement?.focus?.({ preventScroll: true })
  return copied
}

function TaskText({ text }: { text: string }) {
  return <>{parseTaskText(text).map((segment, index) => segment.href ? (
    <a key={index} href={segment.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
      {segment.text}
    </a>
  ) : <span key={index}>{segment.text}</span>)}</>
}

function CopyButton({ field, state, onCopy }: { field: 'title' | 'description'; state: CopyState; onCopy: () => void }) {
  const Icon = state === 'success' ? Check : state === 'error' ? X : Copy
  const label = `Copy Task ${field}`
  return (
    <Button type="button" variant="ghost" size="icon-xs" className="shrink-0" aria-label={label} title={label} onClick={onCopy}>
      <Icon aria-hidden="true" />
    </Button>
  )
}

export function TaskInformation({
  title,
  description,
  titleClassName,
  descriptionClassName,
  titleRef,
}: {
  title: string
  description?: string
  titleClassName: string
  descriptionClassName: string
  titleRef?: RefObject<HTMLHeadingElement | null>
}) {
  const [copyState, setCopyState] = useState<{ field: 'title' | 'description'; state: CopyState } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (field: 'title' | 'description', text: string) => {
    const succeeded = await copyText(formatTaskTextForClipboard(text))
    setCopyState({ field, state: succeeded ? 'success' : 'error' })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopyState(null), 2000)
  }
  const stateFor = (field: 'title' | 'description'): CopyState => copyState?.field === field ? copyState.state : 'idle'

  return (
    <>
      <div className="flex items-start gap-1">
        <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className={titleClassName}><TaskText text={title} /></h1>
        <CopyButton field="title" state={stateFor('title')} onCopy={() => void copy('title', title)} />
      </div>
      {description && (
        <div className="flex items-start gap-1">
          <p className={descriptionClassName}><TaskText text={description} /></p>
          <CopyButton field="description" state={stateFor('description')} onCopy={() => void copy('description', description)} />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {copyState && (copyState.state === 'success' ? `Task ${copyState.field} copied` : "Couldn't copy")}
      </span>
    </>
  )
}
