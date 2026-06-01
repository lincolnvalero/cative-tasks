import { useState, useRef, useEffect } from "react"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useApp } from "@/context/AppContext"
import type { Task, Status, Priority, SavedView } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskDialog } from "@/components/TaskDialog"
import { ProjectIcon } from "@/components/ProjectIcon"
import {
  Trash2, Search, Flag, ArrowUpDown,
  CheckCircle2, Circle, Plus, RefreshCw, Bookmark, X, Check,
  GripVertical, CalendarDays, Loader2, PanelRightOpen,
} from "lucide-react"
import { isPast, isToday, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { showConfirm } from "@/components/ConfirmDialog"

type SortKey = "title" | "status" | "priority" | "dueDate" | "createdAt"
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 }
const STATUS_ORDER: Record<Status, number> = { todo: 0, "in-progress": 1, review: 2, done: 3 }

// ─── Sortable row ──────────────────────────────────────────────────────────────
interface RowProps {
  task: Task
  onOpenTask: (t: Task) => void
  selected: boolean
  onToggleSelect: () => void
  checklistOpen: boolean
  onToggleChecklist: () => void
  newChecklistText: string
  onChecklistTextChange: (v: string) => void
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return <TaskRow {...props} dragRef={setNodeRef} dragStyle={style} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
}

function TaskRow({
  task, onOpenTask, selected, onToggleSelect,
  newChecklistText, onChecklistTextChange,
  dragRef, dragStyle, dragHandleProps, isDragging,
}: RowProps & {
  dragRef?: (el: HTMLTableRowElement | null) => void
  dragStyle?: React.CSSProperties
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}) {
  const { projects, deleteTask, moveTask, updateTask, addChecklistItem, toggleChecklistItem, saving } = useApp()
  const [savingDate, setSavingDate] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation()
    setTitleValue(task.title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 30)
  }

  function saveTitle() {
    if (titleValue.trim() && titleValue !== task.title) {
      updateTask(task.id, { title: titleValue.trim() })
      toast.success("Título atualizado")
    }
    setEditingTitle(false)
  }

  const project = projects.find(p => p.id === task.projectId)
  const status = STATUS_CONFIG[task.status]
  const priority = PRIORITY_CONFIG[task.priority]
  const isDone = task.status === "done"
  const overdue = task.dueDate && !isDone && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
  const dueToday = task.dueDate && !isDone && isToday(parseISO(task.dueDate))
  const checklist = task.checklist ?? []

  useEffect(() => {
    if (!saving) setSavingDate(false)
  }, [saving])

  async function handleDelete() {
    const ok = await showConfirm({ title: `Excluir "${task.title}"?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (ok) { deleteTask(task.id); toast.success("Tarefa excluída") }
  }

  function handleToggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    moveTask(task.id, isDone ? "todo" : "done")
    toast.success(isDone ? "Tarefa reaberta" : "Tarefa concluída!")
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation()
    setSavingDate(true)
    updateTask(task.id, { dueDate: e.target.value || null })
  }

  function addChecklistItemLocal() {
    const text = newChecklistText.trim()
    if (!text) return
    addChecklistItem(task.id, text)
    onChecklistTextChange("")
  }

  return (
    <>
      <tr
        ref={dragRef}
        style={dragStyle}
        className={cn(
          "hover:bg-muted/20 transition-colors",
          overdue && "bg-red-500/5",
          selected && "bg-primary/5",
          isDragging && "opacity-50 bg-muted/30",
          "border-b last:border-0"
        )}
      >
        {/* Drag handle */}
        <td className="px-2 py-3 w-7" onClick={e => e.stopPropagation()}>
          <button {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
            <GripVertical className="size-3.5" />
          </button>
        </td>
        {/* Checkbox */}
        <td className="px-2 py-3 w-8" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="rounded" />
        </td>
        {/* Title — inline edit ao clicar, ícone abre o sheet */}
        <td className="px-2 py-2 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <button onClick={e => { e.stopPropagation(); handleToggleDone(e) }} className="mt-0.5 text-muted-foreground hover:text-primary shrink-0">
              {isDone ? <CheckCircle2 className="size-4 text-green-500" /> : <Circle className="size-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5 group/title">
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    className="font-medium text-sm bg-transparent outline-none border-b border-primary w-full"
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveTitle()
                      if (e.key === "Escape") { setTitleValue(task.title); setEditingTitle(false) }
                    }}
                  />
                ) : (
                  <span
                    className={cn("font-medium text-sm leading-snug cursor-text flex-1", isDone && "line-through text-muted-foreground")}
                    onClick={startEditTitle}
                    title="Clique para editar"
                  >
                    {task.title}
                  </span>
                )}
                {task.recurring && <RefreshCw className="size-3 text-muted-foreground shrink-0 mt-0.5" aria-label="Recorrente" />}
                {/* Ícone para abrir o painel de detalhes */}
                <button
                  onClick={e => { e.stopPropagation(); onOpenTask(task) }}
                  className="shrink-0 mt-0.5 text-muted-foreground/30 hover:text-primary opacity-0 group-hover/title:opacity-100 transition-all"
                  title="Abrir detalhes"
                >
                  <PanelRightOpen className="size-3.5" />
                </button>
              </div>
              {/* Subtarefas sempre visíveis — itálico, cinza, indentado */}
              {checklist.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1">
                  {checklist.map(item => (
                    <button
                      key={item.id}
                      onClick={e => { e.stopPropagation(); toggleChecklistItem(task.id, item.id) }}
                      className="flex items-center gap-1.5 text-left group"
                    >
                      <div className={cn("size-3 rounded border flex items-center justify-center shrink-0 transition-colors", item.done ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary")}>
                        {item.done && <Check className="size-2 text-primary-foreground" />}
                      </div>
                      <span className={cn("text-xs italic text-gray-500 dark:text-gray-400", item.done && "line-through opacity-60")}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                  {/* Add subitem inline */}
                  <div className="flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                    <Plus className="size-3 text-muted-foreground/40 shrink-0" />
                    <input
                      className="text-xs italic text-gray-400 bg-transparent outline-none placeholder:text-muted-foreground/40 w-full"
                      placeholder="Adicionar subitem…"
                      value={newChecklistText}
                      onChange={e => onChecklistTextChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newChecklistText.trim()) addChecklistItemLocal()
                        if (e.key === "Escape") onChecklistTextChange("")
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Add first subitem if no checklist yet — subtle */}
              {checklist.length === 0 && (
                <div className="flex items-center gap-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Plus className="size-3 text-muted-foreground/30 shrink-0" />
                  <input
                    className="text-xs italic text-gray-400 bg-transparent outline-none placeholder:text-muted-foreground/30 w-full"
                    placeholder="Adicionar subitem…"
                    value={newChecklistText}
                    onChange={e => onChecklistTextChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newChecklistText.trim()) addChecklistItemLocal()
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </td>
        {/* Status — inline select */}
        <td className="px-2 py-3 hidden sm:table-cell w-36" onClick={e => e.stopPropagation()}>
          <Select value={task.status} onValueChange={v => {
            moveTask(task.id, v as Status)
            toast.success(`Status: ${STATUS_CONFIG[v as Status].label}`)
          }}>
            <SelectTrigger className={cn("h-7 text-xs border-0 shadow-none focus:ring-0 px-2 w-full", status.color, status.bg)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        {/* Priority — inline select */}
        <td className="px-2 py-3 hidden sm:table-cell w-28" onClick={e => e.stopPropagation()}>
          <Select value={task.priority} onValueChange={v => {
            updateTask(task.id, { priority: v as Priority })
            toast.success(`Prioridade: ${PRIORITY_CONFIG[v as Priority].label}`)
          }}>
            <SelectTrigger className={cn("h-7 text-xs border-0 shadow-none focus:ring-0 px-2 w-full", task.priority !== "none" ? priority.color : "text-muted-foreground/40")}>
              <span className="flex items-center gap-1">
                {task.priority !== "none" && <Flag className="size-3 shrink-0" />}
                <SelectValue placeholder="—" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className={cn("text-xs", v.color)}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        {/* Project — 2 lines, no truncate */}
        <td className="px-2 py-3 hidden md:table-cell w-36">
          {project && (
            <span className="flex items-start gap-1.5 text-xs">
              <ProjectIcon iconKey={project.emoji} className="size-3.5 shrink-0 mt-0.5" style={{ color: project.color }} />
              <span className="whitespace-normal leading-snug">{project.name}</span>
            </span>
          )}
        </td>
        {/* Due date — inline input */}
        <td className="px-2 py-3 hidden lg:table-cell w-32" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {savingDate ? (
              <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <CalendarDays className={cn("size-3 shrink-0", overdue ? "text-red-500" : dueToday ? "text-yellow-600" : "text-muted-foreground")} />
            )}
            <input
              type="date"
              value={task.dueDate ?? ""}
              onChange={handleDueDateChange}
              className={cn(
                "text-xs bg-transparent outline-none w-24 cursor-pointer",
                overdue ? "text-red-500 font-medium" : dueToday ? "text-yellow-600 font-medium" : "text-muted-foreground"
              )}
              title="Data de entrega"
            />
          </div>
        </td>
        {/* Actions */}
        <td className="px-2 py-3 w-10" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        </td>
      </tr>
    </>
  )
}

// ─── Inline add row ──────────────────────────────────────────────────────────
function InlineAddRow({ activeProjectId, defaultProjectId }: { activeProjectId: string | null; defaultProjectId: string }) {
  const { addTask, tasks } = useApp()
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function activate() { setActive(true); setTimeout(() => inputRef.current?.focus(), 30) }

  async function save() {
    if (!title.trim()) { setActive(false); return }
    await addTask({
      title: title.trim(), description: "", status: "todo", priority: "none",
      projectId: activeProjectId ?? defaultProjectId, dueDate: null, tags: [], recurring: null,
      position: tasks.length,
    })
    toast.success("Tarefa criada")
    setTitle("")
    inputRef.current?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text")
    // Detect multi-line or bullet-list paste
    const lines = text
      .split(/\n/)
      .map(l => l.replace(/^[\-\*\•\·\◦\▪\▸\>\d+[\.\)]\s*]+/, "").trim())
      .filter(Boolean)

    if (lines.length <= 1) return // normal paste, let default handle it

    e.preventDefault()
    ;(async () => {
      for (let i = 0; i < lines.length; i++) {
        await addTask({
          title: lines[i], description: "", status: "todo", priority: "none",
          projectId: activeProjectId ?? defaultProjectId, dueDate: null, tags: [], recurring: null,
          position: tasks.length + i,
        })
      }
      toast.success(`${lines.length} tarefas criadas!`)
      setTitle("")
      setActive(false)
    })()
  }

  if (!active) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-2">
          <button onClick={activate} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Plus className="size-3.5" /> Adicionar tarefa <span className="text-muted-foreground/50 text-[10px]">(cole texto com múltiplas linhas para criar várias)</span>
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t">
      <td colSpan={8} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Circle className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Nome da tarefa… Enter para salvar · Cole múltiplas linhas para criar várias"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => {
              if (e.key === "Enter") save()
              if (e.key === "Escape") { setTitle(""); setActive(false) }
            }}
            onBlur={() => { if (!title.trim()) setActive(false) }}
            autoFocus
          />
        </div>
      </td>
    </tr>
  )
}

// ─── Bulk action bar ─────────────────────────────────────────────────────────
function BulkBar({ selected, onClear, onDelete, onChangeStatus, onChangePriority }: {
  selected: string[]
  onClear: () => void
  onDelete: () => void
  onChangeStatus: (s: Status) => void
  onChangePriority: (p: Priority) => void
}) {
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border shadow-lg rounded-xl px-4 py-2.5">
      <span className="text-sm font-medium text-muted-foreground mr-1">
        {selected.length} selecionada{selected.length > 1 ? "s" : ""}
      </span>
      <Select onValueChange={onChangeStatus}>
        <SelectTrigger className="h-7 text-xs w-auto border-dashed gap-1"><span>Status</span></SelectTrigger>
        <SelectContent>
          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([k, v]) => (
            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={onChangePriority}>
        <SelectTrigger className="h-7 text-xs w-auto border-dashed gap-1"><span>Prioridade</span></SelectTrigger>
        <SelectContent>
          {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([k, v]) => (
            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onDelete}>
        <Trash2 className="size-3" /> Excluir
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClear}>
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface ListViewProps {
  onOpenTask: (task: Task) => void
  appliedView?: SavedView | null
}

export function ListView({ onOpenTask, appliedView }: ListViewProps) {
  const { tasks, projects, deleteTasks, updateTasks, activeProjectId, addSavedView, reorderTasks } = useApp()
  const [newOpen, setNewOpen] = useState(false)
  const [search, setSearch] = useState(appliedView?.filters.search ?? "")
  const [filterStatus, setFilterStatus] = useState<string>(appliedView?.filters.status ?? "all")
  const [filterPriority, setFilterPriority] = useState<string>(appliedView?.filters.priority ?? "all")
  const [filterProject, setFilterProject] = useState<string>(appliedView?.filters.projectId ?? "all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [expandedChecklist, setExpandedChecklist] = useState<Record<string, boolean>>({})
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const hasFilters = filterStatus !== "all" || filterPriority !== "all" || filterProject !== "all" || search

  const filtered = tasks
    .filter(t => {
      if (activeProjectId && t.projectId !== activeProjectId) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus !== "all" && t.status !== filterStatus) return false
      if (filterPriority !== "all" && t.priority !== filterPriority) return false
      if (filterProject !== "all" && t.projectId !== filterProject) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === "title") cmp = a.title.localeCompare(b.title)
      else if (sortKey === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      else if (sortKey === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      else if (sortKey === "dueDate") cmp = (a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1
      else cmp = (a.position ?? 0) - (b.position ?? 0)
      return sortAsc ? cmp : (sortKey === "createdAt" ? 1 : -cmp)
    })

  const isDefaultSort = sortKey === "createdAt"

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = filtered.findIndex(t => t.id === active.id)
    const newIndex = filtered.findIndex(t => t.id === over.id)
    const reordered = arrayMove(filtered, oldIndex, newIndex)
    reorderTasks(reordered.map(t => t.id))
  }

  function toggleSelect(id: string) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  async function handleBulkDelete() {
    const ok = await showConfirm({ title: `Excluir ${selected.length} tarefas?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir todas", variant: "destructive" })
    if (ok) {
      deleteTasks(selected); setSelected([])
      toast.success(`${selected.length} tarefas excluídas`)
    }
  }

  function handleBulkStatus(status: Status) {
    updateTasks(selected, { status }); toast.success("Status atualizado"); setSelected([])
  }

  function handleBulkPriority(priority: Priority) {
    updateTasks(selected, { priority }); toast.success("Prioridade atualizada"); setSelected([])
  }

  function handleSaveView() {
    const name = prompt("Nome para este filtro:")
    if (!name?.trim()) return
    addSavedView({
      name: name.trim(),
      filters: {
        status: filterStatus !== "all" ? filterStatus as Status : undefined,
        priority: filterPriority !== "all" ? filterPriority as Priority : undefined,
        projectId: filterProject !== "all" ? filterProject : undefined,
        search: search || undefined,
      },
    })
    toast.success(`View "${name.trim()}" salva!`)
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(true) } }}>
        {label} <ArrowUpDown className={cn("size-3", sortKey === k && "text-primary")} />
      </button>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8 h-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {!activeProjectId && (
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleSaveView}>
              <Bookmark className="size-3.5" /> Salvar view
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isDefaultSort ? handleDragEnd : undefined}>
              <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-7 px-2" />
                      <th className="w-8 px-2" />
                      <th className="text-left px-2 py-2.5"><SortBtn k="title" label="Tarefa" /></th>
                      <th className="text-left px-2 py-2.5 hidden sm:table-cell w-36"><SortBtn k="status" label="Status" /></th>
                      <th className="text-left px-2 py-2.5 hidden sm:table-cell w-28"><SortBtn k="priority" label="Prioridade" /></th>
                      <th className="text-left px-2 py-2.5 hidden md:table-cell w-36">Projeto</th>
                      <th className="text-left px-2 py-2.5 hidden lg:table-cell w-32"><SortBtn k="dueDate" label="Prazo" /></th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Nenhuma tarefa encontrada</td>
                      </tr>
                    )}
                    {filtered.map(task => (
                      <SortableRow
                        key={task.id}
                        task={task}
                        onOpenTask={onOpenTask}
                        selected={selected.includes(task.id)}
                        onToggleSelect={() => toggleSelect(task.id)}
                        checklistOpen={!!expandedChecklist[task.id]}
                        onToggleChecklist={() => setExpandedChecklist(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                        newChecklistText={newChecklistItems[task.id] ?? ""}
                        onChecklistTextChange={v => setNewChecklistItems(prev => ({ ...prev, [task.id]: v }))}
                      />
                    ))}
                    <InlineAddRow activeProjectId={activeProjectId} defaultProjectId={projects[0]?.id ?? ""} />
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {!isDefaultSort && (
          <p className="text-xs text-muted-foreground">Arraste para reordenar apenas no modo padrão (sem ordenação ativa)</p>
        )}
        <p className="text-xs text-muted-foreground">{filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {selected.length > 0 && (
        <BulkBar
          selected={selected}
          onClear={() => setSelected([])}
          onDelete={handleBulkDelete}
          onChangeStatus={handleBulkStatus}
          onChangePriority={handleBulkPriority}
        />
      )}

      <TaskDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  )
}
