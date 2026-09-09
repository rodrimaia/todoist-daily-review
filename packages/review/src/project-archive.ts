import type { Task } from '@doist/todoist-sdk'

export type ProjectArchiveTaskChoice = 'keep_open' | 'complete_tasks' | 'delete_tasks'
export interface ProjectTaskNode { task: Task; children: ProjectTaskNode[] }
export interface ProjectTaskBranch { root: Task; tasks: Task[]; recurringTaskCount: number }
export interface ProjectArchivePlan {
  roots: ProjectTaskNode[]
  activeTaskCount: number
  eligibleTaskCount: number
  preservedTaskCount: number
  recurringTaskCount: number
  eligibleBranches: ProjectTaskBranch[]
  recurringBranches: ProjectTaskBranch[]
}
export interface ProjectArchiveResult {
  choice: ProjectArchiveTaskChoice
  projectArchived: boolean
  keptOpenTasks: number
  completedTasks: number
  deletedTasks: number
  recurringBranchesPreserved: number
  recurringTasksPreserved: number
  failures: number
  disposedTaskIds: string[]
}
export interface ProjectArchiveInput { projectId: string; choice: ProjectArchiveTaskChoice; tasks: Task[] }
export interface ProjectArchiveApi {
  closeTask(taskId: string): Promise<unknown>
  deleteTask(taskId: string): Promise<unknown>
  archiveProject(projectId: string): Promise<unknown>
}

function canBulkDisposeTask(task: Pick<Task, 'due'>): boolean { return task.due?.isRecurring !== true }
function isActiveTask(task: Task): boolean { return task.completedAt == null && task.checked !== true && task.isDeleted !== true }

function createsParentCycle(taskId: string, parentId: string, nodes: Map<string, ProjectTaskNode>): boolean {
  const visited = new Set([taskId])
  let currentId: string | null = parentId
  while (currentId) {
    if (visited.has(currentId)) return true
    visited.add(currentId)
    currentId = nodes.get(currentId)?.task.parentId ?? null
  }
  return false
}

export function buildProjectTaskTree(tasks: Task[]): ProjectTaskNode[] {
  const nodes = new Map<string, ProjectTaskNode>()
  for (const task of tasks) if (isActiveTask(task) && !nodes.has(task.id)) nodes.set(task.id, { task, children: [] })
  const roots: ProjectTaskNode[] = []
  for (const node of nodes.values()) {
    const parentId = node.task.parentId
    const parent = parentId ? nodes.get(parentId) : undefined
    if (!parentId || !parent || createsParentCycle(node.task.id, parentId, nodes)) roots.push(node)
    else parent.children.push(node)
  }
  return roots
}

function flattenBranch(root: ProjectTaskNode): Task[] {
  const tasks: Task[] = []
  const pending = [root]
  while (pending.length) {
    const node = pending.pop()
    if (!node) continue
    tasks.push(node.task)
    for (let index = node.children.length - 1; index >= 0; index--) {
      const child = node.children[index]
      if (child) pending.push(child)
    }
  }
  return tasks
}

export function buildProjectArchivePlan(tasks: Task[]): ProjectArchivePlan {
  const roots = buildProjectTaskTree(tasks)
  const eligibleBranches: ProjectTaskBranch[] = []
  const recurringBranches: ProjectTaskBranch[] = []
  for (const root of roots) {
    const branchTasks = flattenBranch(root)
    const recurringTaskCount = branchTasks.filter((task) => !canBulkDisposeTask(task)).length
    const branch = { root: root.task, tasks: branchTasks, recurringTaskCount }
    if (recurringTaskCount > 0) recurringBranches.push(branch)
    else eligibleBranches.push(branch)
  }
  const eligibleTaskCount = eligibleBranches.reduce((total, branch) => total + branch.tasks.length, 0)
  const preservedTaskCount = recurringBranches.reduce((total, branch) => total + branch.tasks.length, 0)
  const recurringTaskCount = recurringBranches.reduce((total, branch) => total + branch.recurringTaskCount, 0)
  return { roots, activeTaskCount: eligibleTaskCount + preservedTaskCount, eligibleTaskCount, preservedTaskCount, recurringTaskCount, eligibleBranches, recurringBranches }
}

export async function archiveProjectWithTaskDisposition(api: ProjectArchiveApi, input: ProjectArchiveInput): Promise<ProjectArchiveResult> {
  const plan = buildProjectArchivePlan(input.tasks)
  const result: ProjectArchiveResult = {
    choice: input.choice,
    projectArchived: false,
    keptOpenTasks: input.choice === 'keep_open' ? plan.activeTaskCount : plan.preservedTaskCount,
    completedTasks: 0,
    deletedTasks: 0,
    recurringBranchesPreserved: plan.recurringBranches.length,
    recurringTasksPreserved: plan.recurringTaskCount,
    failures: 0,
    disposedTaskIds: [],
  }
  if (input.choice !== 'keep_open') for (const branch of plan.eligibleBranches) {
    try {
      if (input.choice === 'complete_tasks') await api.closeTask(branch.root.id)
      else await api.deleteTask(branch.root.id)
      result.disposedTaskIds.push(...branch.tasks.map((task) => task.id))
      if (input.choice === 'complete_tasks') result.completedTasks += branch.tasks.length
      else result.deletedTasks += branch.tasks.length
    } catch { result.failures++ }
  }
  try { await api.archiveProject(input.projectId); result.projectArchived = true } catch { result.failures++ }
  return result
}
