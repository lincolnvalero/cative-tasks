import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { KanbanView } from "@/components/views/KanbanView"
import { ListView } from "@/components/views/ListView"
import { CalendarView } from "@/components/views/CalendarView"
import { WorkloadView } from "@/components/views/WorkloadView"
import { TaskDialog } from "@/components/TaskDialog"
import { ShortcutsDialog } from "@/components/ShortcutsDialog"
import { useApp } from "@/context/AppContext"
import type { Task } from "@/types/task"
import { Plus, Kanban, List, CalendarDays, BarChart3, X, ChevronDown, FolderKanban, Users, Clock, CalendarClock, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MemberAvatar } from "@/components/MemberAvatar"
import { ProjectIcon } from "@/components/ProjectIcon"
import { cn } from "@/lib/utils"
import { isToday, isPast, parseISO } from "date-fns"

interface Props {
  onOpenTask: (task: Task) => void
  newTaskOpen?: boolean
  onNewTaskClose?: () => void
}

type DueDateFilter = null | "overdue" | "this-week" | "next-30"

const DUE_DATE_LABELS: Record<NonNullable<DueDateFilter>, string> = {
  overdue: "Vencidas",
  "this-week": "Esta semana",
  "next-30": "Próx. 30 dias",
}

export function TasksPage({ onOpenTask, newTaskOpen = false, onNewTaskClose }: Props) {
  const { projects, activeProjectId, setActiveProjectId, savedViews, deleteSavedView, tasks, members } = useApp()
  const [localNewOpen, setLocalNewOpen] = useState(false)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [todayFilter, setTodayFilter] = useState(false)
  const [noDueDateFilter, setNoDueDateFilter] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "calendar" | "workload">(
    () => (localStorage.getItem("cative-active-tab") as "kanban" | "list" | "calendar" | "workload") || "kanban"
  )

  const activeProject = projects.find(p => p.id === activeProjectId)
  const appliedView = savedViews.find(v => v.id === activeViewId) ?? null
  const noDueDateCount = tasks.filter(t => !t.dueDate && t.status !== "done").length
  const overdueCount = tasks.filter(t =>
    t.status !== "done" && t.dueDate &&
    isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
  ).length

  const hasAnyFilter = todayFilter || noDueDateFilter || !!dueDateFilter || !!activeProjectId || assigneeFilter.length > 0

  const isNewOpen = newTaskOpen || localNewOpen
  function closeNew() { setLocalNewOpen(false); onNewTaskClose?.() }

  function clearAllFilters() {
    setTodayFilter(false)
    setNoDueDateFilter(false)
    setDueDateFilter(null)
    setActiveProjectId(null)
    setAssigneeFilter([])
    setActiveViewId(null)
  }

  function handleTabChange(tab: string) {
    if (tab === "kanban" || tab === "list" || tab === "calendar" || tab === "workload") {
      setActiveTab(tab)
      localStorage.setItem("cative-active-tab", tab)
    }
  }

  useEffect(() => {
    const urgent = tasks.filter(t =>
      t.status !== "done" && t.dueDate &&
      (isPast(parseISO(t.dueDate)) || isToday(parseISO(t.dueDate)))
    ).length
    document.title = urgent > 0 ? `(${urgent}) Lincoln Tasks` : "Lincoln Tasks"
  }, [tasks])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); return }
      if (e.metaKey || e.ctrlKey) return
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setLocalNewOpen(true) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">Tarefas</h1>
          <Button onClick={() => setLocalNewOpen(true)} size="sm" className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        {/* Filter toolbar */}
        <div className="flex flex-col gap-2">
          {/* Row 1: quick filters + field filters + clear */}
          <div className="flex items-center gap-1.5 flex-wrap">

            {/* Quick: Todas */}
            <FilterChip
              active={!hasAnyFilter && !activeViewId}
              onClick={clearAllFilters}
            >
              Todas
            </FilterChip>

            {/* Quick: Hoje */}
            <FilterChip
              active={todayFilter}
              onClick={() => {
                const next = !todayFilter
                setTodayFilter(next)
                setNoDueDateFilter(false)
                setActiveViewId(null)
                if (next) handleTabChange("list")
              }}
              icon={<CalendarClock className="size-3.5" />}
            >
              Hoje
            </FilterChip>

            {/* Quick: Sem prazo */}
            {noDueDateCount > 0 && (
              <FilterChip
                active={noDueDateFilter}
                onClick={() => {
                  const next = !noDueDateFilter
                  setNoDueDateFilter(next)
                  setTodayFilter(false)
                  setActiveViewId(null)
                  if (next) handleTabChange("list")
                }}
                badge={noDueDateCount}
              >
                Sem prazo
              </FilterChip>
            )}

            {/* Quick: Vencidas */}
            {overdueCount > 0 && (
              <FilterChip
                active={dueDateFilter === "overdue"}
                onClick={() => {
                  setDueDateFilter(dueDateFilter === "overdue" ? null : "overdue")
                  setActiveViewId(null)
                }}
                badge={overdueCount}
                badgeVariant="danger"
              >
                Vencidas
              </FilterChip>
            )}

            {/* Separator */}
            <div className="h-5 w-px bg-border mx-0.5" />

            {/* Field: Prazo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 text-xs h-7 px-2.5 rounded-md border transition-colors font-medium",
                  dueDateFilter && dueDateFilter !== "overdue"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                  <Clock className="size-3.5" />
                  {dueDateFilter && dueDateFilter !== "overdue" ? DUE_DATE_LABELS[dueDateFilter] : "Prazo"}
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setDueDateFilter(dueDateFilter === "this-week" ? null : "this-week")}>
                  <span className="flex-1">Esta semana</span>
                  {dueDateFilter === "this-week" && <span className="text-primary ml-2">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDueDateFilter(dueDateFilter === "next-30" ? null : "next-30")}>
                  <span className="flex-1">Próximos 30 dias</span>
                  {dueDateFilter === "next-30" && <span className="text-primary ml-2">✓</span>}
                </DropdownMenuItem>
                {dueDateFilter && dueDateFilter !== "overdue" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDueDateFilter(null)} className="text-muted-foreground">
                      Limpar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Field: Projeto */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 text-xs h-7 px-2.5 rounded-md border transition-colors font-medium",
                  activeProjectId
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                  <FolderKanban className="size-3.5" />
                  {activeProject ? (
                    <span className="flex items-center gap-1">
                      <ProjectIcon iconKey={activeProject.emoji} className="size-3" />
                      {activeProject.name}
                    </span>
                  ) : "Projeto"}
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                {projects.map(p => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => setActiveProjectId(activeProjectId === p.id ? null : p.id)}
                    className="gap-2"
                  >
                    <ProjectIcon iconKey={p.emoji} className="size-4 shrink-0" style={{ color: p.color }} />
                    <span className="flex-1">{p.name}</span>
                    {activeProjectId === p.id && <span className="text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
                {activeProjectId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveProjectId(null)} className="text-muted-foreground">
                      Limpar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Field: Responsável */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 text-xs h-7 px-2.5 rounded-md border transition-colors font-medium",
                  assigneeFilter.length > 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                  <Users className="size-3.5" />
                  {assigneeFilter.length > 0
                    ? assigneeFilter.length === 1
                      ? assigneeFilter[0]
                      : `${assigneeFilter.length} responsáveis`
                    : "Responsável"}
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {members.map(m => {
                  const active = assigneeFilter.includes(m.name)
                  return (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => setAssigneeFilter(prev =>
                        active ? prev.filter(n => n !== m.name) : [...prev, m.name]
                      )}
                      className="gap-2"
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span className="flex-1">{m.name}</span>
                      {active && <span className="text-primary">✓</span>}
                    </DropdownMenuItem>
                  )
                })}
                {assigneeFilter.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setAssigneeFilter([])} className="text-muted-foreground">
                      Limpar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear all */}
            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                <RotateCcw className="size-3" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Row 2: saved views (separated, lower prominence) */}
          {savedViews.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mr-0.5">Visões</span>
              {savedViews.map(view => (
                <div key={view.id} className="flex items-center">
                  <button
                    onClick={() => { setTodayFilter(false); setActiveViewId(activeViewId === view.id ? null : view.id) }}
                    className={cn(
                      "text-xs px-2.5 h-6 rounded-l border border-r-0 transition-colors",
                      activeViewId === view.id
                        ? "bg-primary/10 text-primary border-primary/30 font-medium"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {view.name}
                  </button>
                  <button
                    onClick={() => { deleteSavedView(view.id); if (activeViewId === view.id) setActiveViewId(null) }}
                    className={cn(
                      "h-6 px-1.5 rounded-r border transition-colors",
                      activeViewId === view.id
                        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                        : "border-border hover:bg-muted text-muted-foreground hover:text-destructive"
                    )}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="kanban" className="gap-1.5 text-xs sm:text-sm">
              <Kanban className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
              <span className="sm:hidden">Board</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 text-xs sm:text-sm">
              <List className="size-3.5" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="size-3.5" />
              <span className="hidden sm:inline">Calendário</span>
              <span className="sm:hidden">Cal.</span>
            </TabsTrigger>
            <TabsTrigger value="workload" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="size-3.5" />
              <span className="hidden sm:inline">Carga</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="flex-1 min-h-0 mt-3">
            <KanbanView onOpenTask={onOpenTask} assigneeFilter={assigneeFilter} dueDateFilter={dueDateFilter} />
          </TabsContent>

          <TabsContent value="list" className="mt-3">
            <ListView onOpenTask={onOpenTask} appliedView={appliedView} todayFilter={todayFilter} noDueDateFilter={noDueDateFilter} assigneeFilter={assigneeFilter} dueDateFilter={dueDateFilter} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-3" style={{ height: "calc(100vh - 240px)" }}>
            <CalendarView onOpenTask={onOpenTask} />
          </TabsContent>

          <TabsContent value="workload" className="mt-3">
            <WorkloadView onOpenTask={onOpenTask} />
          </TabsContent>
        </Tabs>
      </div>

      <TaskDialog open={isNewOpen} onClose={closeNew} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  )
}

interface FilterChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
  badge?: number
  badgeVariant?: "default" | "danger"
}

function FilterChip({ active, onClick, children, icon, badge, badgeVariant = "default" }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-xs h-7 px-2.5 rounded-md border transition-colors font-medium",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
          active
            ? "bg-white/20 text-white"
            : badgeVariant === "danger"
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              : "bg-muted text-muted-foreground"
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}
