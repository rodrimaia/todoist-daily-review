import { describe, expect, test } from 'bun:test'
import type { PersonalProject, Task, WorkspaceProject } from '@doist/todoist-sdk'
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProjectWithTasks } from '~/lib/weekly-review-machine'
import { ProjectActionBar } from './ProjectActionBar'
import { ProjectArchiveConfirmation } from './ProjectArchiveConfirmation'
import { ProjectReviewCard } from './ProjectReviewCard'

function task(id: string, parentId: string | null = null, recurring = false): Task {
  return {
    id,
    parentId,
    content: id,
    labels: [],
    completedAt: null,
    checked: false,
    isDeleted: false,
    due: recurring
      ? { date: '2030-01-01', string: 'every week', isRecurring: true }
      : null,
  } as unknown as Task
}

function projectWithTasks(
  project: PersonalProject | WorkspaceProject,
  tasks: Task[],
  subprojectCount = 0,
): ProjectWithTasks {
  return { project, tasks, hasNextAction: false, subprojectCount }
}

function personalProject(name = 'Project Alpha'): PersonalProject {
  return { id: 'project', name, parentId: null } as PersonalProject
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textContent).join('')
  if (!isValidElement(node)) return ''
  const props = node.props as { children?: ReactNode }
  return Children.toArray(props.children).map(textContent).join('')
}

function findButton(node: ReactNode, label: string): ReactElement<{
  children?: ReactNode
  onClick?: () => void
}> {
  let match: ReactElement<{ children?: ReactNode; onClick?: () => void }> | null = null

  function visit(current: ReactNode) {
    if (match || !isValidElement(current)) return
    const element = current as ReactElement<{ children?: ReactNode; onClick?: () => void }>
    if (
      typeof element.props.onClick === 'function' &&
      textContent(element.props.children).includes(label)
    ) {
      match = element
      return
    }
    Children.forEach(element.props.children, visit)
  }

  visit(node)
  if (!match) throw new Error(`Button not found: ${label}`)
  return match
}

function renderConfirmation(project: ProjectWithTasks, choice: 'complete_tasks' | null = null) {
  return renderToStaticMarkup(
    <ProjectArchiveConfirmation
      projectWithTasks={project}
      choice={choice}
      onChoiceChange={() => {}}
      onCancel={() => {}}
      onConfirm={() => {}}
    />,
  )
}

describe('Project archive confirmation', () => {
  test('shows the Project name, full-tree counts, exactly three task choices, and confirmation controls', () => {
    const markup = renderConfirmation(projectWithTasks(personalProject(), [
      task('root'),
      task('child', 'root'),
      task('grandchild', 'child'),
    ]))

    expect(markup).toContain('Project Alpha')
    expect(markup).toContain('<strong>3</strong> open tasks, including subtasks at every depth')
    expect(markup).toContain('3 are eligible for bulk completion or deletion')
    expect(markup).toContain('Archive project and keep tasks open')
    expect(markup).toContain('Complete tasks and archive project')
    expect(markup).toContain('Permanently delete tasks and archive project')
    expect((markup.match(/role="radio"/g) ?? []).length).toBe(3)
    expect(markup).toContain('Cancel')
    expect(markup).toContain('Confirm project archive')
    expect(markup).toContain('directly to your Todoist account')
  })

  test('changes only the local choice until Cancel or confirmation is explicitly used', () => {
    const project = projectWithTasks(personalProject(), [task('task')])
    const choices: string[] = []
    let cancellations = 0
    const confirmations: string[] = []
    const unconfirmed = ProjectArchiveConfirmation({
      projectWithTasks: project,
      choice: null,
      onChoiceChange: (choice) => choices.push(choice),
      onCancel: () => { cancellations++ },
      onConfirm: (choice) => { confirmations.push(choice) },
    })

    findButton(unconfirmed, 'Complete tasks and archive project').props.onClick?.()
    expect(choices).toEqual(['complete_tasks'])
    expect(confirmations).toEqual([])
    findButton(unconfirmed, 'Cancel').props.onClick?.()
    expect(cancellations).toBe(1)
    expect(confirmations).toEqual([])

    const confirmed = ProjectArchiveConfirmation({
      projectWithTasks: project,
      choice: 'delete_tasks',
      onChoiceChange: () => {},
      onCancel: () => {},
      onConfirm: (choice) => { confirmations.push(choice) },
    })
    findButton(confirmed, 'Confirm project archive').props.onClick?.()
    expect(confirmations).toEqual(['delete_tasks'])
  })

  test('uses the full archive tree even when the Review tracking task stays hidden from the Project card', () => {
    const project = projectWithTasks(personalProject(), [])
    project.archiveTasks = [
      task('root'),
      task('review-tracking-task', 'root', true),
    ]
    const markup = renderConfirmation(project, 'complete_tasks')

    expect(markup).toContain('<strong>2</strong> open tasks, including subtasks at every depth')
    expect(markup).toContain('<strong>1 recurring task</strong> will remain open')
  })

  test('warns that recurring branches remain open and are preserved in full', () => {
    const markup = renderConfirmation(projectWithTasks(personalProject(), [
      task('root'),
      task('recurring-child', 'root', true),
      task('sibling', 'root'),
    ]), 'complete_tasks')

    expect(markup).toContain('<strong>1 recurring task</strong> will remain open')
    expect(markup).toContain('1 branch containing a recurring task is preserved in full')
    expect(markup).toContain('(3 tasks total in those branches)')
  })

  test('warns that a workspace Project is shared and may affect collaborators', () => {
    const workspaceProject = {
      id: 'workspace-project',
      name: 'Shared roadmap',
      workspaceId: 'workspace',
    } as WorkspaceProject
    const markup = renderConfirmation(projectWithTasks(workspaceProject, []))

    expect(markup).toContain('Shared workspace project')
    expect(markup).toContain('may affect collaborators')
  })
})

describe('Project action regression and Subproject eligibility', () => {
  function renderActions(project: ProjectWithTasks): string {
    return renderToStaticMarkup(
      <ProjectActionBar
        projectWithTasks={project}
        onOk={() => {}}
        onAddTask={() => {}}
        onDeleteProject={() => {}}
        onArchiveProject={() => {}}
        onSkip={() => {}}
        onStop={() => {}}
      />,
    )
  }

  test('keeps existing non-empty Project actions and adds Project archive', () => {
    const markup = renderActions(projectWithTasks(personalProject(), [task('task')]))

    expect(markup).toContain('OK')
    expect(markup).toContain('Add Task')
    expect(markup).toContain('Archive Project')
    expect(markup).toContain('data-slot="dialog-trigger"')
    expect(markup).toContain('Skip')
    expect(markup).toContain('Stop')
    expect(markup).not.toContain('Delete Project')
  })

  test('archives a Project with no open tasks without opening the task-choice dialog', () => {
    const markup = renderActions(projectWithTasks(personalProject(), []))

    expect(markup).toContain('Archive Project')
    expect(markup).not.toContain('data-slot="dialog-trigger"')
    expect(markup).not.toContain('aria-haspopup="dialog"')
  })

  test('still asks for a task choice when the archive scope contains a hidden open task', () => {
    const project = projectWithTasks(personalProject(), [])
    project.archiveTasks = [task('review-tracking-task', null, true)]

    const markup = renderActions(project)

    expect(markup).toContain('data-slot="dialog-trigger"')
    expect(markup).toContain('aria-haspopup="dialog"')
  })

  test('keeps empty Project deletion and marks parents ineligible for Project archive', () => {
    const markup = renderActions(projectWithTasks(personalProject(), [], 2))

    expect(markup).toContain('Delete Project')
    expect(markup).toContain('Archive Project')
    expect(markup).toContain('Projects with subprojects must be reviewed independently')
    expect(markup).toContain('Project archive unavailable: 2 subprojects must be reviewed independently')

    const cardMarkup = renderToStaticMarkup(
      <ProjectReviewCard
        projectWithTasks={projectWithTasks(personalProject(), [], 2)}
        animationKey="project"
      />,
    )
    expect(cardMarkup).toContain('This project cannot use Project archive while it has subprojects')
  })
})
