import { useState, useRef } from "react"
import { useApp } from "@/context/AppContext"
import type { Task, Status } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskDialog } from "@/components/TaskDialog"
import { ProjectIcon } from "@/components/ProjectIcon"
import { Plus, CalendarDays, Flag, CheckCircle2, Circle, MessageSquare, CheckSquare, RefreshCw } from "lucide-react"
import { format, isPast, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const COLUMNS: Status[] = ["todo", "in-progress", "review", "done"]

interface KanbanViewProps { onOpenTask: (task: Task) => void }

// ─── Inline add ───────────────────────────────────────────────────────────────
function InlineAdd({ status, defaultProjectId }: { status: Status; defaultProjectId: string }) {
  const { addTask } = useApp()
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function activate() { setActive(true); setTimeout(() => inputRef.current?.focus(), 50) }

  function save() {
    const t = title.trim()
    if (t) {
      addTask({ title: t, description: "", status, priority: "none", projectId: defaultProjectId, dueDate: null, tags: [], recurring: null })
      toast.success("Tarefa criada")
    }
    setTitle("")
    setActive(false)
  }

  if (!active) {
    return (
      <button
        onClick={activate}
        className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-background/60 transition-colors"
      >
        <Plus className="size-3.5" /> Adicionar tarefa
      </button>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-2 flex flex-col gap-2">
      <input
        ref={inputRef}
        className="text-sm bg-transparent outline-none w-full placeholder:text-muted-foreground"
        placeholder="Nome da tarefa..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") { setTitle(""); setActive(false) }
        }}
        onBlur={() => { if (!title.trim()) setActive(false) }}
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-6 text-xs px-2" onClick={save} disabled={!title.trim()}>Salvar</Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setTitle(""); setActive(false) }}>Cancelar</Button>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function KanbanCard({ task, onOpenTask }: { task: Task; onOpenTask: (t: Task) => void }) {
  const { moveTask, projects } = useApp()
  const project = projects.find(p => p.id === task.projectId)
  const priority = PRIORITY_CONFIG[task.priority]
  const isDone = task.status === "done"
  const overdue = task.dueDate && !isDone && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
  const dueToday = task.dueDate && !isDone && isToday(parseISO(task.dueDate))
  const checklistDone = (task.checklist ?? []).filter(i => i.done).length
  const checklistTotal = (task.checklist ?? []).length
  const commentCount = (task.comments ?? []).length

  function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    moveTask(task.id, isDone ? "todo" : "done")
    toast.success(isDone ? "Tarefa reaberta" : "Tarefa concluída!")
  }

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all select-none touch-pan-y",
        overdue && "border-red-400/60",
        dueToday && "border-yellow-400/60",
        isDone && "opacity-55"
      )}
      onClick={() => onOpenTask(task)}
      draggable
      onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
    >
      <div className="flex items-start gap-2">
        <button onClick={toggleDone} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
          {isDone ? <CheckCircle2 className="size-4 text-green-500" /> : <Circle className="size-4" />}
        </button>
        <p className={cn("text-sm font-medium leading-snug flex-1", isDone && "line-through")}>{task.title}</p>
        {task.recurring && (
          <RefreshCw className="size-3 text-muted-foreground shrink-0 mt-0.5" aria-label="Recorrente" />
        )}
      </div>

      <div className="flex items-center justify-between pl-6">
        {project && (
          <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
            <ProjectIcon iconKey={project.emoji} className="size-3" style={{ color: project.color }} />
            <span>{project.name}</span>
          </Badge>
        )}
        {task.priority !== "none" && (
          <span className={cn("flex items-center gap-1 text-xs ml-auto", priority.color)}>
            <Flag className="size-3" />{priority.label}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {task.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pl-6">
        {task.dueDate && (
          <span className={cn("flex items-center gap-1 text-xs",
            overdue ? "text-red-500 font-medium" : dueToday ? "text-yellow-600 font-medium" : "text-muted-foreground"
          )}>
            <CalendarDays className="size-3" />
            {overdue && "Atr. · "}{dueToday && "Hoje · "}
            {format(parseISO(task.dueDate), "dd MMM", { locale: ptBR })}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckSquare className="size-3" />{checklistDone}/{checklistTotal}
            </span>
          )}
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3" />{commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────
export function KanbanView({ onOpenTask }: KanbanViewProps) {
  const { tasks, moveTask, activeProjectId, projects: allProjects } = useApp()
  const [newStatus, setNewStatus] = useState<Status | null>(null)
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null)

  const visibleTasks = activeProjectId ? tasks.filter(t => t.projectId === activeProjectId) : tasks
  const defaultProjectId = activeProjectId ?? allProjects[0]?.id ?? ""

  function handleDrop(e: React.DragEvent, status: Status) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    if (taskId) { moveTask(taskId, status); toast.success(`Movido para ${STATUS_CONFIG[status].label}`) }
    setDragOverCol(null)
  }

  return (
    <>
      {/* Horizontal scroll with snap on mobile */}
      <div className="flex gap-3 h-full overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none scroll-smooth px-1">
        {COLUMNS.map(status => {
          const config = STATUS_CONFIG[status]
          const colTasks = visibleTasks.filter(t => t.status === status)
          const isDragOver = dragOverCol === status
          return (
            <div
              key={status}
              className="flex flex-col gap-2 min-w-[85vw] w-[85vw] md:min-w-[280px] md:w-[280px] snap-center md:snap-align-none"
              onDragOver={e => { e.preventDefault(); setDragOverCol(status) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", config.color)}>
                    {config.label}
                  </span>
                  <Badge variant="secondary" className="size-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {colTasks.length}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className={cn(
                  "flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-all",
                  config.bg,
                  isDragOver && "ring-2 ring-primary/40"
                )}>
                  {colTasks.map(task => (
                    <KanbanCard key={task.id} task={task} onOpenTask={onOpenTask} />
                  ))}
                  {colTasks.length === 0 && !isDragOver && (
                    <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
                      Vazio
                    </div>
                  )}
                  {isDragOver && (
                    <div className="h-12 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center text-xs text-primary">
                      Soltar aqui
                    </div>
                  )}
                  {/* Inline add */}
                  <InlineAdd status={status} defaultProjectId={defaultProjectId} />
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>

      <TaskDialog open={!!newStatus} onClose={() => setNewStatus(null)} defaultStatus={newStatus ?? undefined} />
    </>
  )
}
