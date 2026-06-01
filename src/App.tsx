import { useState, useEffect } from "react"
import { AppProvider } from "@/context/AppContext"
import { AppSidebar } from "@/components/AppSidebar"
import { BottomNav } from "@/components/BottomNav"
import { DashboardPage } from "@/pages/DashboardPage"
import { TasksPage } from "@/pages/TasksPage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { TaskDetailSheet } from "@/components/TaskDetailSheet"
import { CommandPalette } from "@/components/CommandPalette"
import { ConfirmDialogProvider } from "@/components/ConfirmDialog"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/components/theme-provider"
import { useApp } from "@/context/AppContext"
import { Toaster, toast } from "sonner"
import { Sun, Moon, Monitor, Search, Loader2 } from "lucide-react"
import type { Task } from "@/types/task"
import { isToday, parseISO } from "date-fns"

type Page = "dashboard" | "tasks" | "projects"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const icons = { light: <Sun className="size-4" />, dark: <Moon className="size-4" />, system: <Monitor className="size-4" /> }
  const next: Record<string, typeof theme> = { light: "dark", dark: "system", system: "light" }
  return (
    <Button variant="ghost" size="icon" className="size-8" onClick={() => setTheme(next[theme])}>
      {icons[theme]}
    </Button>
  )
}

function AppInner() {
  const { loading, saving, setActiveProjectId, tasks } = useApp()
  const [page, setPage] = useState<Page>("dashboard")
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)

  const PAGE_LABELS: Record<Page, string> = { dashboard: "Dashboard", tasks: "Tarefas", projects: "Projetos" }

  // Check for tasks due today
  useEffect(() => {
    const notifiedKey = "cative-today-notification"
    const already = sessionStorage.getItem(notifiedKey)
    if (!already && tasks.length > 0) {
      const dueTodayCount = tasks.filter(t => {
        return t.dueDate && isToday(parseISO(t.dueDate)) && t.status !== "done"
      }).length

      if (dueTodayCount > 0) {
        toast.info(`${dueTodayCount} tarefa${dueTodayCount > 1 ? 's' : ''} vence hoje!`)
        sessionStorage.setItem(notifiedKey, "true")
      }
    }
  }, [tasks])

  function triggerSearch() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
  }

  return (
    <SidebarProvider>
      <AppSidebar page={page} onNavigate={setPage} />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium text-muted-foreground flex-1">{PAGE_LABELS[page]}</span>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground text-xs hidden sm:flex" onClick={triggerSearch}>
            <Search className="size-3.5" />
            <span className="hidden md:inline">Buscar</span>
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] hidden md:inline">Ctrl K</kbd>
          </Button>
          {saving && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Salvando...</TooltipContent>
            </Tooltip>
          )}
          <ThemeToggle />
        </header>

        {/* Main — extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {loading && (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-40" />
            </div>
          )}
          {!loading && page === "dashboard" && <DashboardPage />}
          {!loading && page === "tasks" && (
            <TasksPage
              onOpenTask={setDetailTask}
              newTaskOpen={newTaskOpen}
              onNewTaskClose={() => setNewTaskOpen(false)}
            />
          )}
          {!loading && page === "projects" && <ProjectsPage />}
        </main>
      </SidebarInset>

      {/* Mobile bottom nav */}
      <BottomNav page={page} onNavigate={setPage} onSearch={triggerSearch} />

      {/* Global overlays */}
      <TaskDetailSheet task={detailTask} onClose={() => setDetailTask(null)} />
      <CommandPalette
        onNavigate={setPage}
        onOpenTask={task => { setPage("tasks"); setDetailTask(task) }}
        onNewTask={() => { setPage("tasks"); setNewTaskOpen(true) }}
        setActiveProjectId={setActiveProjectId}
      />
      <ConfirmDialogProvider />
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <TooltipProvider>
        <AppInner />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </AppProvider>
  )
}
