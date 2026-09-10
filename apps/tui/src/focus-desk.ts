import type { Task } from '@doist/todoist-sdk'
import type { TodoistProject } from '@todoist-review/todoist'
import { currentDailyReviewTask, dailyReviewSummary, type DailyReviewState } from '@todoist-review/review'

export type DailyOverlay =
  | { kind: 'project-search'; query: string; selectedIndex: number }
  | { kind: 'project-date'; projectId: string }
  | { kind: 'rename'; draft: string; error?: string }

export interface DailyRenderOptions {
  projects?: readonly TodoistProject[]
  overlay?: DailyOverlay
  width?: number
}

const ansi = {
  reset: '\u001b[0m', bold: '\u001b[1m', dim: '\u001b[2m',
  cyan: '\u001b[36m', blue: '\u001b[34m', green: '\u001b[32m',
  yellow: '\u001b[33m', magenta: '\u001b[35m', red: '\u001b[31m',
  white: '\u001b[37m', slate: '\u001b[90m', bgBlue: '\u001b[44m', bgCyan: '\u001b[46m',
}

const stripAnsi = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, '')
const visibleWidth = (value: string) => stripAnsi(value).length
const fit = (value: string, width: number) => {
  const plain = stripAnsi(value)
  if (plain.length <= width) return `${value}${' '.repeat(width - plain.length)}`
  return `${plain.slice(0, Math.max(0, width - 1))}…`
}
const rule = (width: number, character = '─') => character.repeat(Math.max(0, width))

function isInboxProject(project: TodoistProject): boolean {
  return 'inboxProject' in project && project.inboxProject === true
}

/** Search the selectable project set using the same case-insensitive name matching as the web picker. */
export function searchProjects(projects: readonly TodoistProject[], query: string): TodoistProject[] {
  const normalized = query.trim().toLocaleLowerCase()
  return projects.filter((project) => !isInboxProject(project) && project.name.toLocaleLowerCase().includes(normalized))
}

function panel(title: string, body: string[], width: number, accent = ansi.cyan): string[] {
  const inner = Math.max(12, width - 2)
  return [
    `${accent}╭${rule(inner)}╮${ansi.reset}`,
    `${accent}│${ansi.reset}${ansi.bold} ${fit(title, inner - 1)}${accent}│${ansi.reset}`,
    `${accent}├${rule(inner)}┤${ansi.reset}`,
    ...body.map((item) => `${accent}│${ansi.reset} ${fit(item, inner - 1)}${accent}│${ansi.reset}`),
    `${accent}╰${rule(inner)}╯${ansi.reset}`,
  ]
}

function taskMeta(task: Task): string {
  const due = task.due?.string ?? 'No date'
  const labels = task.labels.length ? task.labels.map((label) => `@${label}`).join(' ') : 'No labels'
  return `${ansi.magenta}◈${ansi.reset} project ${task.projectId}   ${ansi.yellow}▣${ansi.reset} ${due}   ${ansi.cyan}${labels}${ansi.reset}`
}

function progress(current: number, total: number, width: number): string {
  const filled = total ? Math.round((current / total) * width) : 0
  return `${ansi.cyan}${'━'.repeat(filled)}${ansi.slate}${'╌'.repeat(Math.max(0, width - filled))}${ansi.reset}`
}

function header(phase: string, title: string, width: number): string[] {
  return [
    `${ansi.cyan}◆${ansi.reset} ${ansi.bold}TODOIST ${ansi.dim}/ ${phase.toUpperCase()}${ansi.reset}`,
    `${ansi.bold}${ansi.white}${title}${ansi.reset}`,
    `${ansi.dim}Keyboard-first review · focus desk${ansi.reset}`,
    rule(width, '·'),
  ]
}

function projectSearchPanel(projects: readonly TodoistProject[], overlay: Extract<DailyOverlay, { kind: 'project-search' }>, width: number): string[] {
  const matches = searchProjects(projects, overlay.query)
  const body = [
    `${ansi.dim}Type to filter · ↑/↓ move · enter select · esc cancel${ansi.reset}`,
    '',
    `${ansi.bgBlue}${ansi.bold}${ansi.white} ${overlay.query || 'Search projects…'} ${ansi.reset}`,
    '',
    ...matches.slice(0, 8).map((project, index) => {
      const selected = index === overlay.selectedIndex
      return `${selected ? `${ansi.bgCyan}${ansi.blue}` : ansi.dim}${selected ? '›' : ' '} ${project.name}${ansi.reset}`
    }),
    ...(matches.length ? [] : [overlay.query.trim() ? `${ansi.yellow}↳ No match. Press enter to create “${overlay.query.trim()}”.${ansi.reset}` : `${ansi.dim}Start typing a project name.${ansi.reset}`]),
    '',
    `${ansi.dim}enter${ansi.reset} create when no match   ${ansi.dim}esc${ansi.reset} cancel`,
  ]
  return panel('MOVE TASK TO PROJECT', body, width, ansi.magenta)
}

function projectDatePanel(task: Task, project: TodoistProject | undefined, width: number): string[] {
  const options = [
    ...(task.due ? [`${ansi.dim}k${ansi.reset} keep ${task.due.string ?? 'current date'}`] : []),
    `${ansi.dim}1${ansi.reset} today     ${ansi.dim}2${ansi.reset} tomorrow`,
    `${ansi.dim}3${ansi.reset} Saturday  ${ansi.dim}4${ansi.reset} Monday`,
    `${ansi.dim}0${ansi.reset} ${task.due ? 'remove date' : 'no date'}`,
  ]
  return panel(`SCHEDULE IN ${project?.name ?? 'PROJECT'}`, [
    `${ansi.dim}The task will move out of Inbox.${ansi.reset}`,
    '',
    ...options,
    '',
    `${ansi.dim}esc${ansi.reset} cancel`,
  ], width, ansi.yellow)
}

function renamePanel(overlay: Extract<DailyOverlay, { kind: 'rename' }>, width: number): string[] {
  return panel('RENAME TASK', [
    `${ansi.dim}Edit the title, then press enter to save.${ansi.reset}`,
    '',
    `${ansi.bgBlue}${ansi.bold}${ansi.white} ${overlay.draft || ' '}${ansi.reset}`,
    ...(overlay.error ? ['', `${ansi.red}${overlay.error}${ansi.reset}`] : []),
    '',
    `${ansi.dim}enter${ansi.reset} save   ${ansi.dim}esc${ansi.reset} cancel`,
  ], width, ansi.blue)
}

function centered(lines: string[], width: number): string[] {
  const contentWidth = Math.max(...lines.map(visibleWidth))
  const offset = Math.max(0, Math.floor((width - contentWidth) / 2))
  return lines.map((item) => `${' '.repeat(offset)}${item}`)
}

export function renderDailyFocus(state: DailyReviewState, options: DailyRenderOptions = {}): string {
  const width = Math.max(60, Math.min(options.width ?? process.stdout.columns ?? 100, 140))
  if (state.phase === 'summary') {
    const summary = dailyReviewSummary(state)
    const lines = [
      ...header('DAILY REVIEW', 'Review complete', Math.min(76, width - 8)),
      '',
      ...panel('DECISIONS MADE', Object.entries(summary).map(([name, count]) => `${ansi.green}✓${ansi.reset} ${name.padEnd(22)} ${ansi.bold}${count}${ansi.reset}`), Math.min(76, width - 8), ansi.green),
      '',
      `${ansi.dim}Press q to return home.${ansi.reset}`,
    ]
    return `${centered(lines, width).join('\n')}${ansi.reset}\n`
  }

  if (state.phase === 'error') {
    const lines = [
      ...header('DAILY REVIEW', 'Something needs attention', Math.min(76, width - 8)),
      '',
      ...panel('SAVE FAILED', [
        `${ansi.red}${state.error ?? 'Unable to save decision.'}${ansi.reset}`,
        '',
        `${ansi.dim}r${ansi.reset} retry   ${ansi.dim}q${ansi.reset} return home`,
      ], Math.min(76, width - 8), ansi.red),
    ]
    return `${centered(lines, width).join('\n')}${ansi.reset}\n`
  }

  const task = currentDailyReviewTask(state)
  const queue = state.phase === 'inbox' ? state.inboxTasks : state.filterTasks
  const total = queue.length
  const cleared = state.actions.length
  const panelWidth = Math.min(76, width - 8)
  const lines = [
    ...header(state.phase === 'inbox' ? 'INBOX' : 'FILTER', state.phase === 'inbox' ? 'Clear the Inbox' : 'Review next actions', panelWidth),
    '',
    `${ansi.dim}${state.phase === 'inbox' ? 'INBOX' : 'FILTER'}${ansi.reset}  ${ansi.bold}${total} tasks in queue${ansi.reset}    ${progress(cleared, Math.max(total + cleared, 1), 22)}    ${ansi.dim}${cleared} cleared${ansi.reset}`,
    '',
    ...(options.overlay?.kind === 'rename'
      ? renamePanel(options.overlay, panelWidth)
      : options.overlay?.kind === 'project-search' && state.phase === 'inbox'
      ? projectSearchPanel(options.projects ?? [], options.overlay, panelWidth)
      : options.overlay?.kind === 'project-date' && state.phase === 'inbox'
        ? projectDatePanel(task!, options.projects?.find((project) => project.id === options.overlay?.projectId), panelWidth)
        : panel('CURRENT TASK', [
          '',
          task ? `${ansi.bold}${ansi.white}${task.content}${ansi.reset}` : `${ansi.dim}No task selected${ansi.reset}`,
          '',
          task ? taskMeta(task) : '',
          '',
          state.status === 'confirming'
            ? `${ansi.red}${ansi.bold}Delete this task permanently?${ansi.reset}  ${ansi.dim}y${ansi.reset} yes  ${ansi.dim}n${ansi.reset} no`
            : state.phase === 'inbox'
              ? `${ansi.bgBlue}${ansi.bold}${ansi.white} m ${ansi.reset} move to project   ${ansi.dim}c${ansi.reset} complete   ${ansi.dim}d${ansi.reset} delete`
              : `${ansi.bgBlue}${ansi.bold}${ansi.white} c ${ansi.reset} complete   ${ansi.dim}d${ansi.reset} delete   ${ansi.dim}0${ansi.reset} remove date`,
          '',
        ], panelWidth, ansi.cyan)),
    '',
    `${ansi.dim}${state.index + 1} / ${total}   •   ${state.phase === 'inbox' ? 'Inbox phase' : 'Filter phase'}${ansi.reset}`,
    '',
    `${rule(panelWidth, '·')}`,
    `${ansi.dim}↑/↓ navigate   enter select   ? help   q stop${ansi.reset}`,
  ]
  return `${centered(lines, width).join('\n')}${ansi.reset}\n`
}
