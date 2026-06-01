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
import { Plus, Kanban, List, CalendarDays, BarChart3, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isToday, isPast, parseISO } from "date-fns"

interface Props {
  onOpenTask: (task: Task) => void
  newTaskOpen?: boolean
  onNewTaskClose?: () => void
}

export function TasksPage({ onOpenTask, newTaskOpen = false, onNewTaskClose }: Props) {
  const { projects, activeProjectId, setActiveProjectId, savedViews, deleteSavedView, tasks } = useApp()
  const [localNewOpen, setLocalNewOpen] = useState(false)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [todayFilter, setTodayFilter] = useState(false)
  const [noDueDateFilter, setNoDueDateFilter] = useState(false)

  // Contagem para os chips
  const noDueDateCount = tasks.filter(t => !t.dueDate && t.status !== "done").length
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "calendar" | "workload">(
    () => (localStorage.getItem("cative-active-tab") as "kanban" | "list" | "calendar" | "workload") || "kanban"
  )
  const activeProject = projects.find(p => p.id === activeProjectId)
  const appliedView = savedViews.find(v => v.id === activeViewId) ?? null

  const isNewOpen = newTaskOpen || localNewOpen
  function closeNew() { setLocalNewOpen(false); onNewTaskClose?.() }

  function handleTabChange(tab: string) {
    if (tab === "kanban" || tab === "list" || tab === "calendar" || tab === "workload") {
      setActiveTab(tab)
      localStorage.setItem("cative-active-tab", tab)
    }
  }

  // Update document title with urgent count
  useEffect(() => {
    const urgent = tasks.filter(t =>
      t.status !== "done" && t.dueDate &&
      (isPast(parseISO(t.dueDate)) || isToday(parseISO(t.dueDate)))
    ).length
    document.title = urgent > 0 ? `(${urgent}) Cative Tasks` : "Cative Tasks"
  }, [tasks])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if (e.key === "?") {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Tarefas</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeProject && (
                <button
                  onClick={() => setActiveProjectId(null)}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border text-foreground hover:bg-muted transition-colors"
                  style={{ borderColor: activeProject.color + "66", color: activeProject.color }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: activeProject.color }} />
                  {activeProject.name} <X className="size-3" />
                </button>
              )}
            </div>
          </div>
          <Button onClick={() => setLocalNewOpen(true)} size="sm" className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        {/* Saved views quick-access */}
        {(savedViews.length > 0 || true) && (
          <div className="flex gap-1.5 flex-wrap">
            {/* Chip: Todas */}
            <button
              onClick={() => { setTodayFilter(false); setNoDueDateFilter(false); setActiveViewId(null) }}
              className={cn("text-xs px-3 py-1 rounded-full border transition-colors", !todayFilter && !noDueDateFilter && !activeViewId ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
            >
              Todas
            </button>
            {/* Chip: Hoje */}
            <button
              onClick={() => { setTodayFilter(!todayFilter); setNoDueDateFilter(false); setActiveViewId(null); handleTabChange("list") }}
              className={cn("text-xs px-3 py-1 rounded-full border transition-colors", todayFilter ? "bg-yellow-500 text-white border-yellow-500" : "border-border hover:bg-muted")}
            >
              📅 Hoje
            </button>
            {/* Chip: Sem prazo */}
            {noDueDateCount > 0 && (
              <button
                onClick={() => { setNoDueDateFilter(!noDueDateFilter); setTodayFilter(false); setActiveViewId(null); handleTabChange("list") }}
                className={cn("text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1", noDueDateFilter ? "bg-orange-500 text-white border-orange-500" : "border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20")}
                title={`${noDueDateCount} tarefa${noDueDateCount > 1 ? "s" : ""} sem prazo definido`}
              >
                📭 Sem prazo
                <span className={cn("text-[10px] font-bold px-1 rounded-full", noDueDateFilter ? "bg-white/20" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30")}>
                  {noDueDateCount}
                </span>
              </button>
            )}
            {savedViews.map(view => (
              <div key={view.id} className="flex items-center">
                <button
                  onClick={() => { setTodayFilter(false); setActiveViewId(activeViewId === view.id ? null : view.id) }}
                  className={cn("text-xs px-3 py-1 rounded-l-full border border-r-0 transition-colors", activeViewId === view.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                >
                  {view.name}
                </button>
                <button
                  onClick={() => { deleteSavedView(view.id); if (activeViewId === view.id) setActiveViewId(null) }}
                  className={cn("text-xs px-1.5 py-1 rounded-r-full border transition-colors hover:text-destructive", activeViewId === view.id ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80 hover:text-primary-foreground" : "border-border hover:bg-muted")}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

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

          <TabsContent value="kanban" className="flex-1 overflow-auto mt-3">
            <KanbanView onOpenTask={onOpenTask} />
          </TabsContent>

          <TabsContent value="list" className="mt-3">
            <ListView onOpenTask={onOpenTask} appliedView={appliedView} todayFilter={todayFilter} noDueDateFilter={noDueDateFilter} />
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
