/** Returns whether a global review shortcut may handle this keyboard event. */
export function isEligibleReviewShortcut(event: KeyboardEvent): boolean {
  if (
    event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
    event.repeat || event.isComposing || event.defaultPrevented ||
    isEditableEventTarget(event) || isDialogOpen()
  ) return false

  return true
}

function isEditableEventTarget(event: KeyboardEvent): boolean {
  const path = event.composedPath()
  return path.some((target) => {
    if (!(target instanceof HTMLElement)) return false
    return target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLInputElement
  })
}

function isDialogOpen(): boolean {
  return Boolean(document.querySelector('dialog[open], [role="dialog"]'))
}
