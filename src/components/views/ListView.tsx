import { useState, useRef } from "react"
import { useApp } from "@/context/AppContext"
import type { Task, Status, Priority, SavedView } from "@/types/task"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskDialog } from "@/components/TaskDialog"
import { ProjectIcon } from "@/components/ProjectIcon"
import {
  Pencil, Trash2, Search, CalendarDays, Flag, ArrowUpDown,
  CheckCircle2, Circle, Plus, RefreshCw, Bookmark, X,
} from "lucide-react"
import { format, isPast, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type SortKey = "title" | "status" | "priority" | "dueDate" | "createdAt"
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 }
const STATUS_ORDER: Record<Status, number> = { todo: 0, "in-progress": 1, review: 2, done: 3 }

interface ListViewProps {
  onOpenTask: (task: Task) => void
  appliedView?: SavedView | null
}

// ─── Inline add row ───────────────────────────────────────────────────────────
function InlineAddRow({ activeProjectId, defaultProjectId }: { activeProjectId: string | null; defaultProjectId: string }) {
  const { addTask } = useApp()
  const [active, setActive] = useState(false)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function activate() { setActive(true); setTimeout(() => inputRef.current?.focus(), 30) }

  function save() {
    if (title.trim()) {
      addTask({ title: title.trim(), description: "", status: "todo", priority: "none", projectId: activeProjectId ?? defaultProjectId, dueDate: null, tags: [], recurring: null })
      toast.success("Tarefa criada")
      setTitle("")
      inputRef.current?.focus()
    } else {
      setActive(false)
    }
  }

  if (!active) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-2">
          <button
            onClick={activate}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1"
          >
            <Plus className="size-3.5" /> Adicionar tarefa
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-2" colSpan={7}>
        <div className="flex items-center gap-2">
          <Circle className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Nome da tarefa… Enter para salvar, Esc para cancelar"
            value={title}
            onChange={e => setTitle(e.target.value)}
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

// ─── Bulk action bar ──────────────────────────────────────────────────────────
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
        <SelectTrigger className="h-7 text-xs w-auto border-dashed gap-1">
          <span>Status</span>
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([k, v]) => (
            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={onChangePriority}>
        <SelectTrigger className="h-7 text-xs w-auto border-dashed gap-1">
          <span>Prioridade</span>
        </SelectTrigger>
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
export function ListView({ onOpenTask, appliedView }: ListViewProps) {
  const { tasks, projects, deleteTask, deleteTasks, updateTasks, moveTask, activeProjectId, addSavedView } = useApp()
  const [newOpen, setNewOpen] = useState(false)
  const [search, setSearch] = useState(appliedView?.filters.search ?? "")
  const [filterStatus, setFilterStatus] = useState<string>(appliedView?.filters.status ?? "all")
  const [filterPriority, setFilterPriority] = useState<string>(appliedView?.filters.priority ?? "all")
  const [filterProject, setFilterProject] = useState<string>(appliedView?.filters.projectId ?? "all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

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
      else cmp = a.createdAt < b.createdAt ? -1 : 1
      return sortAsc ? cmp : -cmp
    })

  const allSelected = filtered.length > 0 && selected.length === filtered.length
  function toggleSelectAll() { setSelected(allSelected ? [] : filtered.map(t => t.id)) }
  function toggleSelect(id: string) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  function handleToggleDone(task: Task) {
    moveTask(task.id, task.status === "done" ? "todo" : "done")
    toast.success(task.status === "done" ? "Tarefa reaberta" : "Tarefa concluída!")
  }

  function handleDelete(task: Task) {
    if (confirm(`Excluir "${task.title}"?`)) { deleteTask(task.id); toast.success("Tarefa excluída") }
  }

  function handleBulkDelete() {
    if (confirm(`Excluir ${selected.length} tarefas?`)) {
      deleteTasks(selected); setSelected([]); toast.success(`${selected.length} tarefas excluídas`)
    }
  }

  function handleBulkStatus(status: Status) {
    updateTasks(selected, { status }); toast.success(`Status atualizado`)
    setSelected([])
  }

  function handleBulkPriority(priority: Priority) {
    updateTasks(selected, { priority }); toast.success(`Prioridade atualizada`)
    setSelected([])
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

  const hasFilters = filterStatus !== "all" || filterPriority !== "all" || filterProject !== "all" || search

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filters bar */}
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
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleSaveView} title="Salvar filtro atual como view">
              <Bookmark className="size-3.5" /> Salvar view
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="text-left px-2 py-2.5 w-[38%]"><SortBtn k="title" label="Título" /></th>
                  <th className="text-left px-3 py-2.5 hidden sm:table-cell"><SortBtn k="status" label="Status" /></th>
                  <th className="text-left px-3 py-2.5 hidden sm:table-cell"><SortBtn k="priority" label="Prior." /></th>
                  <th className="text-left px-3 py-2.5 hidden md:table-cell">Projeto</th>
                  <th className="text-left px-3 py-2.5 hidden lg:table-cell"><SortBtn k="dueDate" label="Entrega" /></th>
                  <th className="px-3 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                      Nenhuma tarefa encontrada
                    </td>
                  </tr>
                )}
                {filtered.map(task => {
                  const status = STATUS_CONFIG[task.status]
                  const priority = PRIORITY_CONFIG[task.priority]
                  const project = projects.find(p => p.id === task.projectId)
                  const isDone = task.status === "done"
                  const overdue = task.dueDate && !isDone && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
                  const dueToday = task.dueDate && !isDone && isToday(parseISO(task.dueDate))
                  const isChecked = selected.includes(task.id)
                  return (
                    <tr key={task.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", overdue && "bg-red-500/5", isChecked && "bg-primary/5")}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(task.id)} onClick={e => e.stopPropagation()} className="rounded" />
                      </td>
                      <td className="px-2 py-3 cursor-pointer" onClick={() => onOpenTask(task)}>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); handleToggleDone(task) }} className="text-muted-foreground hover:text-primary shrink-0">
                            {isDone ? <CheckCircle2 className="size-4 text-green-500" /> : <Circle className="size-4" />}
                          </button>
                          <span className={cn("font-medium truncate", isDone && "line-through text-muted-foreground")}>
                            {task.title}
                          </span>
                          {task.recurring && <RefreshCw className="size-3 text-muted-foreground shrink-0" aria-label="Recorrente" />}
                        </div>
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-6">
                            {task.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <Badge variant="outline" className={cn("text-xs", status.color, status.bg)}>{status.label}</Badge>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {task.priority !== "none" && (
                          <span className={cn("flex items-center gap-1 text-xs", priority.color)}>
                            <Flag className="size-3" /> {priority.label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        {project && (
                          <span className="flex items-center gap-1.5 text-xs">
                            <ProjectIcon iconKey={project.emoji} className="size-3.5 shrink-0" style={{ color: project.color }} />
                            {project.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {task.dueDate && (
                          <span className={cn("flex items-center gap-1 text-xs",
                            overdue ? "text-red-500 font-medium" : dueToday ? "text-yellow-600 font-medium" : "text-muted-foreground"
                          )}>
                            <CalendarDays className="size-3" />
                            {format(parseISO(task.dueDate), "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => onOpenTask(task)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={() => handleDelete(task)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <InlineAddRow activeProjectId={activeProjectId} defaultProjectId={projects[0]?.id ?? ""} />
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Bulk action bar */}
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
