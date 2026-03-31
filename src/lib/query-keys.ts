export const queryKeys = {
  projects: ['projects'] as const,
  inboxTasks: ['tasks', 'inbox'] as const,
  filterTasks: (filter: string) => ['tasks', 'filter', filter] as const,
  todayTasks: ['tasks', 'today'] as const,
}
