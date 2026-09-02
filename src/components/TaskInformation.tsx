import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Copy, Pencil, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
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
  onRename,
  renameShortcutVersion = 0,
}: {
  title: string
  description?: string
  titleClassName: string
  descriptionClassName: string
  titleRef?: RefObject<HTMLHeadingElement | null>
  onRename?: (title: string) => Promise<void>
  renameShortcutVersion?: number
}) {
  const [copyState, setCopyState] = useState<{ field: 'title' | 'description'; state: CopyState } | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [renameSucceeded, setRenameSucceeded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const handledShortcutVersion = useRef(renameShortcutVersion)
  useEffect(() => () => clearTimeout(timer.current), [])

  const startRename = () => {
    setEditedTitle(title)
    setRenameError(null)
    setIsRenaming(true)
  }

  useEffect(() => {
    if (renameShortcutVersion === handledShortcutVersion.current) return
    handledShortcutVersion.current = renameShortcutVersion
    if (onRename) startRename()
  }, [renameShortcutVersion]) // The version changes only when the global shortcut is pressed.

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus()
  }, [isRenaming])

  const copy = async (field: 'title' | 'description', text: string) => {
    const succeeded = await copyText(formatTaskTextForClipboard(text))
    setCopyState({ field, state: succeeded ? 'success' : 'error' })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopyState(null), 2000)
  }
  const stateFor = (field: 'title' | 'description'): CopyState => copyState?.field === field ? copyState.state : 'idle'

  const cancelRename = () => {
    setIsRenaming(false)
    setEditedTitle(title)
    setRenameError(null)
  }

  const saveRename = async () => {
    const nextTitle = editedTitle
    if (!nextTitle.trim()) {
      setRenameError('Task title cannot be empty.')
      return
    }
    if (nextTitle === title) {
      cancelRename()
      return
    }
    if (!onRename) return

    setIsSaving(true)
    setRenameError(null)
    try {
      await onRename(nextTitle)
      setIsRenaming(false)
      setRenameSucceeded(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setRenameSucceeded(false), 3000)
    } catch {
      setRenameError("Couldn't rename task. Your edited title is still available.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-start gap-1">
        {isRenaming ? (
          <form className="flex w-full flex-wrap items-start gap-2" onSubmit={(event) => { event.preventDefault(); void saveRename() }}>
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="task-title-editor">Task title</label>
              <Input
                ref={renameInputRef}
                id="task-title-editor"
                value={editedTitle}
                onChange={(event) => { setEditedTitle(event.target.value); setRenameError(null) }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelRename()
                  }
                }}
                aria-invalid={Boolean(renameError)}
                aria-describedby={renameError ? 'task-title-error' : undefined}
                disabled={isSaving}
              />
              {renameError && <p id="task-title-error" className="mt-1 text-sm text-destructive">{renameError}</p>}
            </div>
            <Button type="submit" size="sm" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelRename} disabled={isSaving}>Cancel</Button>
          </form>
        ) : (
          <>
            <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className={titleClassName}><TaskText text={title} /></h1>
            {onRename && <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={startRename}><Pencil aria-hidden="true" />Rename</Button>}
            <CopyButton field="title" state={stateFor('title')} onCopy={() => void copy('title', title)} />
          </>
        )}
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
      {renameSucceeded && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-lg">Task renamed</div>}
    </>
  )
}
