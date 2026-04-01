export const queryKeys = {
  projects: ['projects'] as const,
  inboxTasks: ['tasks', 'inbox'] as const,
  filterTasks: (filter: string) => ['tasks', 'filter', filter] as const,
  todayTasks: ['tasks', 'today'] as const,
  projectTasks: (projectId: string) => ['tasks', 'project', projectId] as const,
  somedayTasks: (projectId: string) => ['tasks', 'someday', projectId] as const,
  upcomingTasks: ['tasks', 'upcoming'] as const,
}
