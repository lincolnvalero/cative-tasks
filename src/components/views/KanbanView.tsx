import { useState, useRef } from "react"
import { useApp } from "@/context/AppContext"
import type { Task, Status } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskDialog } from "@/components/TaskDialog"
import { ProjectIcon } from "@/components/ProjectIcon"
import { Plus, CalendarDays, Flag, CheckCircle2, Circle, MessageSquare, CheckSquare, RefreshCw, Check, X as XIcon } from "lucide-react"
import { isPast, isToday, parseISO } from "date-fns"
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

  async function save() {
    const t = title.trim()
    if (t) {
      await addTask({ title: t, description: "", status, priority: "none", projectId: defaultProjectId, dueDate: null, tags: [], recurring: null, position: 0 })
      toast.success("Tarefa criada")
    }
    setTitle("")
    setActive(false)
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text")
    const lines = text.split(/\n/).map(l => l.replace(/^[\-\*\•\·\◦\▪\▸\>\d+[\.\)]\s*]+/, "").trim()).filter(Boolean)
    if (lines.length <= 1) return
    e.preventDefault()
    for (const line of lines) {
      await addTask({ title: line, description: "", status, priority: "none", projectId: defaultProjectId, dueDate: null, tags: [], recurring: null, position: 0 })
    }
    toast.success(`${lines.length} tarefas criadas!`)
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
        onPaste={handlePaste}
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
  const { moveTask, projects, addChecklistItem, toggleChecklistItem, updateTask } = useApp()
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [newItem, setNewItem] = useState("")
  const newItemRef = useRef<HTMLInputElement>(null)
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
        {/* Due date — inline editable */}
        <div onClick={e => e.stopPropagation()} className="flex items-center gap-1">
          <CalendarDays className={cn("size-3 shrink-0", overdue ? "text-red-500" : dueToday ? "text-yellow-600" : "text-muted-foreground")} />
          <input
            type="date"
            value={task.dueDate ?? ""}
            onChange={e => { updateTask(task.id, { dueDate: e.target.value || null }) }}
            className={cn(
              "text-xs bg-transparent outline-none cursor-pointer w-[86px]",
              overdue ? "text-red-500 font-medium" : dueToday ? "text-yellow-600 font-medium" : "text-muted-foreground"
            )}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={e => { e.stopPropagation(); setChecklistOpen(v => !v); setTimeout(() => newItemRef.current?.focus(), 50) }}
            className={cn("flex items-center gap-1 text-xs transition-colors", checklistTotal > 0 ? "text-muted-foreground hover:text-primary" : "text-muted-foreground/40 hover:text-primary")}
            title="Subitens"
          >
            <CheckSquare className="size-3" />
            {checklistTotal > 0 ? `${checklistDone}/${checklistTotal}` : "+"}
          </button>
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3" />{commentCount}
            </span>
          )}
        </div>
      </div>

      {checklistOpen && (
        <div className="flex flex-col gap-1 pt-2 border-t" onClick={e => e.stopPropagation()}>
          {(task.checklist ?? []).map(item => (
            <button key={item.id} onClick={() => toggleChecklistItem(task.id, item.id)} className="flex items-center gap-2 w-full text-left group">
              <div className={cn("size-3.5 rounded border flex items-center justify-center shrink-0 transition-colors", item.done ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary")}>
                {item.done && <Check className="size-2 text-primary-foreground" />}
              </div>
              <span className={cn("text-xs flex-1 text-left", item.done && "line-through text-muted-foreground")}>{item.text}</span>
            </button>
          ))}
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              ref={newItemRef}
              className="flex-1 text-xs bg-muted/40 rounded px-2 py-1 outline-none placeholder:text-muted-foreground"
              placeholder="Novo subitem… Enter"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newItem.trim()) { addChecklistItem(task.id, newItem.trim()); setNewItem("") }
                if (e.key === "Escape") setChecklistOpen(false)
              }}
            />
            <button onClick={() => setChecklistOpen(false)} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}
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
      {/* Mobile: snap horizontal scroll  |  Desktop: grid preenche tela toda */}
      <div className="flex gap-3 h-full overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth px-1 md:grid md:grid-cols-4 md:overflow-x-visible md:snap-none">
        {COLUMNS.map(status => {
          const config = STATUS_CONFIG[status]
          const colTasks = visibleTasks.filter(t => t.status === status)
          const isDragOver = dragOverCol === status
          return (
            <div
              key={status}
              className="flex flex-col gap-2 min-w-[85vw] snap-center md:min-w-0 md:w-auto md:snap-align-none"
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
