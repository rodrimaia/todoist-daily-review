import { useState } from 'react'
import type { Task } from '@doist/todoist-sdk'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Lightbulb, Play, Trash2, ArrowRight, Square } from 'lucide-react'
import type { SomedayStats } from '~/lib/weekly-review-machine'

type TaskAction = 'activated' | 'deleted' | null

export function SomedayReviewCard({
  tasks,
  onActivate,
  onDelete,
  onDone,
  onStop,
}: {
  tasks: Task[]
  onActivate: (taskId: string) => void
  onDelete: (taskId: string) => void
  onDone: (stats: SomedayStats) => void
  onStop: () => void
}) {
  const [actions, setActions] = useState<Map<string, TaskAction>>(new Map())

  function handleActivate(taskId: string) {
    onActivate(taskId)
    setActions((prev) => new Map(prev).set(taskId, 'activated'))
  }

  function handleDelete(taskId: string) {
    onDelete(taskId)
    setActions((prev) => new Map(prev).set(taskId, 'deleted'))
  }

  function handleDone() {
    let activated = 0
    let deleted = 0
    let kept = 0
    for (const task of tasks) {
      const action = actions.get(task.id)
      if (action === 'activated') activated++
      else if (action === 'deleted') deleted++
      else kept++
    }
    onDone({ activated, deleted, kept })
  }

  return (
    <Card className="w-full max-w-md animate-in fade-in duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            Someday/Maybe
          </CardTitle>
          <span className="text-sm text-muted-foreground">{tasks.length} items</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y max-h-96 overflow-y-auto">
          {tasks.map((task) => {
            const action = actions.get(task.id)
            return (
              <div
                key={task.id}
                className={`flex items-center gap-2 py-2 ${action ? 'opacity-40' : ''}`}
              >
                <p className={`flex-1 text-sm min-w-0 truncate ${action === 'deleted' ? 'line-through' : ''}`}>
                  {task.content}
                </p>
                {!action && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActivate(task.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title="Activate"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {action === 'activated' && (
                  <span className="text-xs text-muted-foreground shrink-0">activated</span>
                )}
                {action === 'deleted' && (
                  <span className="text-xs text-muted-foreground shrink-0">deleted</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleDone} className="gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            Continue
          </Button>
          <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5 text-muted-foreground">
            <Square className="h-3.5 w-3.5" />
            Stop
            <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">esc</kbd>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
