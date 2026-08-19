interface TokenPersistenceChoiceProps {
  id: string
  remembered: boolean
  onRememberedChange: (remembered: boolean) => void
  disabled?: boolean
}

const TODOIST_TOKEN_HELP_URL =
  'https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB'

export function TokenPersistenceChoice({
  id,
  remembered,
  onRememberedChange,
  disabled = false,
}: TokenPersistenceChoiceProps) {
  const descriptionId = `${id}-description`

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-start gap-2 text-sm font-medium">
        <input
          id={id}
          type="checkbox"
          checked={remembered}
          aria-describedby={descriptionId}
          onChange={(event) => onRememberedChange(event.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        <span>Remember this token on this device</span>
      </label>
      <p id={descriptionId} className="text-xs text-muted-foreground">
        {remembered
          ? 'The token stays in this browser on this device until you clear it. You can also revoke its access in Todoist.'
          : 'Temporary by default: the token stays in this browser tab, survives reloads, and is removed when the tab session ends.'}
      </p>
      <p className="text-xs text-muted-foreground">
        Use{' '}
        <a
          href={TODOIST_TOKEN_HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Todoist&apos;s official guidance
        </a>{' '}
        to find or revoke your API token.
      </p>
    </div>
  )
}
