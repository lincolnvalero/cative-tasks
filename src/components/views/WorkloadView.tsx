import { startOfWeek, parseISO, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useApp } from "@/context/AppContext"
import type { Task } from "@/types/task"
import { STATUS_CONFIG } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Props {
  onOpenTask: (task: Task) => void
}

export function WorkloadView({ onOpenTask }: Props) {
  const { tasks, projects } = useApp()

  // Group by week
  const byWeek: Record<string, Task[]> = {}
  const noDate: Task[] = []

  for (const task of tasks) {
    if (!task.dueDate) {
      noDate.push(task)
    } else {
      const week = startOfWeek(parseISO(task.dueDate), { weekStartsOn: 1 }).toISOString()
      if (!byWeek[week]) byWeek[week] = []
      byWeek[week].push(task)
    }
  }

  // Sort weeks
  const weeks = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b))

  // Calculate volume bar (max 10 tasks per bar for visualization)
  function getVolumePercent(count: number) {
    return Math.min((count / 10) * 100, 100)
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {weeks.length === 0 && noDate.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa com prazo.</p>
      )}

      {weeks.map(([weekStr, weekTasks]) => {
        const weekDate = new Date(weekStr)
        const weekLabel = format(weekDate, "dd 'de' MMM", { locale: ptBR })

        return (
          <div key={weekStr} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Semana de {weekLabel}</h3>
              <Badge variant="secondary" className="text-xs">{weekTasks.length} tarefas</Badge>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary/50 transition-all"
                style={{ width: `${getVolumePercent(weekTasks.length)}%` }}
              />
            </div>

            <div className="space-y-1.5">
              {weekTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId)
                const statusCfg = STATUS_CONFIG[task.status]

                return (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="w-full flex items-center gap-2 p-2 rounded border border-border/50 hover:bg-muted/50 text-left text-xs transition-colors"
                  >
                    <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color, statusCfg.bg)}>
                      {statusCfg.label}
                    </Badge>
                    <span className="flex-1 truncate font-medium">{task.title}</span>
                    {project && (
                      <span className="text-xs text-muted-foreground shrink-0">{project.name}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {noDate.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <h3 className="font-semibold text-sm">Sem prazo</h3>
          <div className="space-y-1.5">
            {noDate.map(task => {
              const project = projects.find(p => p.id === task.projectId)
              const statusCfg = STATUS_CONFIG[task.status]

              return (
                <button
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  className="w-full flex items-center gap-2 p-2 rounded border border-border/50 hover:bg-muted/30 text-left text-xs transition-colors"
                >
                  <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color, statusCfg.bg)}>
                    {statusCfg.label}
                  </Badge>
                  <span className="flex-1 truncate font-medium">{task.title}</span>
                  {project && (
                    <span className="text-xs text-muted-foreground shrink-0">{project.name}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
