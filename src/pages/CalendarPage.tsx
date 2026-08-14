import { CalendarView } from "@/components/views/CalendarView"
import type { Task } from "@/types/task"

interface Props {
  onOpenTask: (task: Task) => void
}

export function CalendarPage({ onOpenTask }: Props) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-xl sm:text-2xl font-bold">Calendário</h1>
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 180px)" }}>
        <CalendarView onOpenTask={onOpenTask} />
      </div>
    </div>
  )
}
