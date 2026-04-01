import { useState } from 'react'
import type { PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { FolderPlus } from 'lucide-react'

type Project = PersonalProject | WorkspaceProject

export function ProjectPicker({
  projects,
  onSelect,
  onCreateNew,
  onCancel,
}: {
  projects: Project[]
  onSelect: (project: Project) => void
  onCreateNew: (name: string) => void
  onCancel: () => void
}) {
  const [search, setSearch] = useState('')

  return (
    <Command className="border rounded-lg max-h-64">
      <CommandInput
        placeholder="Search projects..."
        value={search}
        onValueChange={setSearch}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      />
      <CommandList>
        <CommandEmpty>
          {search.trim() ? (
            <button
              onClick={() => onCreateNew(search.trim())}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              Create "{search.trim()}"
            </button>
          ) : (
            <span className="text-muted-foreground">No projects found</span>
          )}
        </CommandEmpty>
        <CommandGroup>
          {projects.map((project) => (
            <CommandItem
              key={project.id}
              value={project.name}
              onSelect={() => onSelect(project)}
              className="cursor-pointer"
            >
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
