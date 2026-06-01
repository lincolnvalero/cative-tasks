import { useState } from "react"
import { useApp } from "@/context/AppContext"
import type { Task } from "@/types/task"
import { STATUS_CONFIG } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth,
  isSameDay, parseISO, isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
  onOpenTask: (task: Task) => void
}

export function CalendarView({ onOpenTask }: CalendarViewProps) {
  const { tasks, activeProjectId } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const visibleTasks = (activeProjectId
    ? tasks.filter(t => t.projectId === activeProjectId)
    : tasks
  ).filter(t => t.dueDate)

  function tasksForDay(day: Date) {
    return visibleTasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day))
  }

  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(d => subMonths(d, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(d => addMonths(d, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 rounded-lg border overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/40 shrink-0">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Days grid — each cell scrolls internally */}
          <div className="grid grid-cols-7 flex-1 overflow-auto" style={{ gridAutoRows: "minmax(110px, 1fr)" }}>
            {days.map(day => {
              const dayTasks = tasksForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-b flex flex-col overflow-hidden",
                    !inMonth && "opacity-40 bg-muted/20",
                    today && "bg-primary/5"
                  )}
                >
                  <div className="px-1.5 pt-1.5 shrink-0">
                    <span className={cn(
                      "text-xs font-medium size-6 flex items-center justify-center rounded-full",
                      today && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Tasks — scrollable, all shown */}
                  <div className="flex-1 overflow-y-auto px-1 pb-1 flex flex-col gap-0.5">
                    {dayTasks.slice(0, 2).map(task => {
                      const status = STATUS_CONFIG[task.status]
                      return (
                        <Tooltip key={task.id}>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "text-left text-xs px-1.5 py-0.5 rounded w-full transition-opacity hover:opacity-80 leading-snug truncate",
                                status.bg, status.color
                              )}
                              onClick={() => onOpenTask(task)}
                            >
                              {task.title}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-muted-foreground">{status.label}</div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1 py-0.5">
                        +{dayTasks.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </>
  )
}
