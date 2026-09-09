import {
  TodoistApi,
  type CurrentUser,
  type PersonalProject,
  type Task,
  type WorkspaceProject,
} from '@doist/todoist-sdk'

export type TodoistProject = PersonalProject | WorkspaceProject

export interface TodoistPage<T> {
  results: T[]
  nextCursor: string | null
}

export interface TodoistPort {
  getUser(): Promise<CurrentUser>
  getTask(id: string): Promise<Task>
  getTasks(args?: { cursor?: string }): Promise<TodoistPage<Task>>
  getTasksByFilter(args: { query: string; cursor?: string }): Promise<TodoistPage<Task>>
  getProjects(args?: { cursor?: string }): Promise<TodoistPage<TodoistProject>>
  addTask(args: Record<string, unknown>): Promise<Task>
  updateTask(id: string, args: Record<string, unknown>): Promise<Task>
  moveTask(id: string, args: { projectId?: string; sectionId?: string; parentId?: string }): Promise<Task>
  closeTask(id: string): Promise<boolean>
  deleteTask(id: string): Promise<boolean>
  addProject(args: Record<string, unknown>): Promise<TodoistProject>
  updateProject(id: string, args: Record<string, unknown>): Promise<TodoistProject>
  deleteProject(id: string): Promise<boolean>
  archiveProject(id: string): Promise<TodoistProject>
}

export class TodoistAdapterError extends Error {
  readonly operation: string
  override readonly cause: unknown

  constructor(operation: string, cause: unknown) {
    super(`Todoist ${operation} failed`)
    this.name = 'TodoistAdapterError'
    this.operation = operation
    this.cause = cause
  }
}

type TodoistApiLike = Pick<
  TodoistApi,
  | 'getUser'
  | 'getTask'
  | 'getTasks'
  | 'getTasksByFilter'
  | 'getProjects'
  | 'addTask'
  | 'updateTask'
  | 'moveTask'
  | 'closeTask'
  | 'deleteTask'
  | 'addProject'
  | 'updateProject'
  | 'deleteProject'
  | 'archiveProject'
>

/**
 * Production Todoist boundary. The token is supplied by the caller and is
 * never read from browser storage or included in any query identity.
 */
export class TodoistAdapter implements TodoistPort {
  readonly #api: TodoistApiLike

  constructor(token: string, apiFactory: (token: string) => TodoistApiLike = (value) => new TodoistApi(value)) {
    if (!token.trim()) throw new Error('Todoist API token must not be empty')
    this.#api = apiFactory(token)
  }

  async #call<T>(operation: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action()
    } catch (error) {
      throw new TodoistAdapterError(operation, error)
    }
  }

  getUser() { return this.#call('getUser', () => this.#api.getUser()) }
  getTask(id: string) { return this.#call('getTask', () => this.#api.getTask(id)) }
  getTasks(args?: { cursor?: string }) { return this.#call('getTasks', () => this.#api.getTasks(args)) }
  getTasksByFilter(args: { query: string; cursor?: string }) { return this.#call('getTasksByFilter', () => this.#api.getTasksByFilter(args)) }
  getProjects(args?: { cursor?: string }) { return this.#call('getProjects', () => this.#api.getProjects(args)) }
  addTask(args: Record<string, unknown>) { return this.#call('addTask', () => this.#api.addTask(args as Parameters<TodoistApi['addTask']>[0])) }
  updateTask(id: string, args: Record<string, unknown>) { return this.#call('updateTask', () => this.#api.updateTask(id, args as Parameters<TodoistApi['updateTask']>[1])) }
  moveTask(id: string, args: { projectId?: string; sectionId?: string; parentId?: string }) { return this.#call('moveTask', () => this.#api.moveTask(id, args as Parameters<TodoistApi['moveTask']>[1])) }
  closeTask(id: string) { return this.#call('closeTask', () => this.#api.closeTask(id)) }
  deleteTask(id: string) { return this.#call('deleteTask', () => this.#api.deleteTask(id)) }
  addProject(args: Record<string, unknown>) { return this.#call('addProject', () => this.#api.addProject(args as Parameters<TodoistApi['addProject']>[0])) }
  updateProject(id: string, args: Record<string, unknown>) { return this.#call('updateProject', () => this.#api.updateProject(id, args as Parameters<TodoistApi['updateProject']>[1])) }
  deleteProject(id: string) { return this.#call('deleteProject', () => this.#api.deleteProject(id)) }
  archiveProject(id: string) { return this.#call('archiveProject', () => this.#api.archiveProject(id)) }
}

export interface InMemoryTodoistData {
  user?: CurrentUser
  tasks?: Task[]
  projects?: TodoistProject[]
}

/** Deterministic adapter for shared Review scenarios and client smoke tests. */
export class InMemoryTodoistAdapter implements TodoistPort {
  readonly user: CurrentUser | undefined
  readonly tasks: Task[]
  readonly projects: TodoistProject[]
  readonly calls: Array<{ method: string; args: unknown[] }> = []

  constructor(data: InMemoryTodoistData = {}) {
    this.user = data.user
    this.tasks = [...(data.tasks ?? [])]
    this.projects = [...(data.projects ?? [])]
  }

  #record(method: string, ...args: unknown[]) { this.calls.push({ method, args }) }
  #page<T>(results: T[], cursor?: string): TodoistPage<T> {
    const start = cursor ? Number(cursor) : 0
    const page = results.slice(start, start + 50)
    const next = start + page.length < results.length ? String(start + page.length) : null
    return { results: page, nextCursor: next }
  }

  async getUser() { this.#record('getUser'); if (!this.user) throw new Error('No in-memory user configured'); return this.user }
  async getTask(id: string) { this.#record('getTask', id); const task = this.tasks.find((item) => item.id === id); if (!task) throw new Error(`Task ${id} not found`); return task }
  async getTasks(args?: { cursor?: string }) { this.#record('getTasks', args); return this.#page(this.tasks, args?.cursor) }
  async getTasksByFilter(args: { query: string; cursor?: string }) { this.#record('getTasksByFilter', args); return this.#page(this.tasks, args.cursor) }
  async getProjects(args?: { cursor?: string }) { this.#record('getProjects', args); return this.#page(this.projects, args?.cursor) }
  async addTask(args: Record<string, unknown>): Promise<Task> { this.#record('addTask', args); throw new Error('InMemoryTodoistAdapter.addTask requires a task factory in a scenario') }
  async updateTask(id: string, args: Record<string, unknown>) { this.#record('updateTask', id, args); const task = await this.getTask(id); Object.assign(task, args); return task }
  async moveTask(id: string, args: { projectId?: string; sectionId?: string; parentId?: string }) { this.#record('moveTask', id, args); const task = await this.getTask(id); if (args.projectId) task.projectId = args.projectId; return task }
  async closeTask(id: string) { this.#record('closeTask', id); const task = await this.getTask(id); task.completedAt = new Date().toISOString(); return true }
  async deleteTask(id: string) { this.#record('deleteTask', id); const index = this.tasks.findIndex((task) => task.id === id); if (index < 0) return false; this.tasks.splice(index, 1); return true }
  async addProject(_args: Record<string, unknown>): Promise<TodoistProject> { this.#record('addProject', _args); throw new Error('InMemoryTodoistAdapter.addProject requires a project factory in a scenario') }
  async updateProject(id: string, args: Record<string, unknown>) { this.#record('updateProject', id, args); const project = this.projects.find((item) => item.id === id); if (!project) throw new Error(`Project ${id} not found`); Object.assign(project, args); return project }
  async deleteProject(id: string) { this.#record('deleteProject', id); const index = this.projects.findIndex((project) => project.id === id); if (index < 0) return false; this.projects.splice(index, 1); return true }
  async archiveProject(id: string) { this.#record('archiveProject', id); const project = this.projects.find((item) => item.id === id); if (!project) throw new Error(`Project ${id} not found`); return project }
}

export async function getAllPages<T>(load: (args?: { cursor?: string }) => Promise<TodoistPage<T>>): Promise<T[]> {
  const results: T[] = []
  let cursor: string | undefined
  do {
    const page = await load(cursor ? { cursor } : undefined)
    results.push(...page.results)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return results
}
