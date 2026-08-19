import { useEffect, useRef, type ReactNode } from 'react'
import type { PersonalProject, Task, WorkspaceProject } from '@doist/todoist-sdk'
import { Calendar, Folder, Repeat2, Tag } from 'lucide-react'
import type { ReviewState } from '~/lib/review-machine'

type Project = PersonalProject | WorkspaceProject

interface DailyReviewExperienceProps {
  state: ReviewState
  task: Task
  projectMap: Map<string, Project>
  actions: ReactNode
}

function TaskMetadata({
  task,
  projectMap,
}: Pick<DailyReviewExperienceProps, 'task' | 'projectMap'>) {
  const project = projectMap.get(task.projectId)
  const items = [
    project && { key: 'project', icon: Folder, label: project.name },
    task.due && {
      key: 'due',
      icon: task.due.isRecurring ? Repeat2 : Calendar,
      label: task.due.string || task.due.date,
    },
    task.labels.length > 0 && { key: 'labels', icon: Tag, label: task.labels.join(' · ') },
  ].filter(Boolean) as { key: string; icon: typeof Folder; label: string }[]

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map(({ key, icon: Icon, label }) => (
        <span
          key={key}
          className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400"
        >
          <Icon className="size-3.5" />
          {label}
        </span>
      ))}
    </div>
  )
}

export function DailyReviewExperience({
  state,
  task,
  projectMap,
  actions,
}: DailyReviewExperienceProps) {
  const tasks = state.phase === 'inbox' ? state.inboxTasks : state.filterTasks
  const total = tasks.length
  const current = state.currentIndex + 1
  const percent = total === 0 ? 0 : (state.currentIndex / total) * 100
  const phaseLabel = state.phase === 'inbox' ? 'Inbox' : 'Next actions'
  const taskTitleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    taskTitleRef.current?.focus({ preventScroll: true })
  }, [task.id, state.phase])

  return (
    <main className="morning-paper min-h-screen bg-[#f4efe6] px-5 py-8 text-[#29251f] dark:bg-[#1c1b18] dark:text-[#f6f0e7] sm:px-10 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl grid-rows-[auto_1fr] gap-10">
        <header className="flex items-start justify-between gap-6 border-b border-current/20 pb-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
              <span>Daily review</span>
              <span className="size-1 rounded-full bg-current" />
              <span>{phaseLabel}</span>
            </div>
            <p className="font-serif text-xl italic sm:text-2xl">
              A quiet place to decide what matters.
            </p>
          </div>
          <div
            className="shrink-0 text-right font-mono text-xs leading-5 text-current/55"
            role="progressbar"
            aria-label={`${phaseLabel} review progress`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={state.currentIndex}
          >
            <div>
              {current.toString().padStart(2, '0')} / {total.toString().padStart(2, '0')}
            </div>
            <div>{Math.round(percent)}% cleared</div>
          </div>
        </header>

        <div className="grid items-center gap-10 pb-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)] lg:gap-20">
          <article key={`${state.phase}-${task.id}`} className="content-enter relative max-w-3xl" aria-labelledby="current-task-title">
            <div className="mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-current/45">
              <span>On your desk</span>
              <span className="h-px flex-1 bg-current/20" />
            </div>
            <h1
              id="current-task-title"
              ref={taskTitleRef}
              tabIndex={-1}
              className="text-balance font-serif text-4xl leading-[1.08] tracking-[-0.025em] sm:text-6xl lg:text-7xl"
            >
              {task.content}
            </h1>
            {task.description && (
              <p className="mt-7 max-w-2xl border-l-2 border-orange-600/60 pl-5 font-serif text-lg leading-8 text-current/65 sm:text-xl">
                {task.description}
              </p>
            )}
            <div className="mt-8">
              <TaskMetadata task={task} projectMap={projectMap} />
            </div>
          </article>

          <aside className="border-t border-current/20 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-orange-700 text-sm font-semibold text-white">
                {current}
              </span>
              <div>
                <h2 className="font-serif text-xl">Make the call</h2>
                <p className="text-xs text-current/50">One clear task decision, then move on.</p>
              </div>
            </div>
            <div className="[&>div]:max-w-none">{actions}</div>
          </aside>
        </div>
      </div>
    </main>
  )
}
