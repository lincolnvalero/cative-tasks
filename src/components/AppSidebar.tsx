import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/context/AppContext"
import type { Status } from "@/types/task"
import { LayoutDashboard, CheckSquare, FolderKanban, Zap } from "lucide-react"
import { ProjectIcon } from "@/components/ProjectIcon"

type Page = "dashboard" | "tasks" | "projects"

interface Props {
  page: Page
  onNavigate: (p: Page) => void
}

const ACTIVE_STATUSES: Status[] = ["todo", "in-progress", "review"]

export function AppSidebar({ page, onNavigate }: Props) {
  const { tasks, projects, activeProjectId, setActiveProjectId } = useApp()

  const activeTasks = tasks.filter(t => ACTIVE_STATUSES.includes(t.status)).length

  function handleProjectClick(projectId: string) {
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
    } else {
      setActiveProjectId(projectId)
      onNavigate("tasks")
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="size-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Cative Tasks</p>
            <p className="text-xs text-muted-foreground">Diretoria de Operações</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "dashboard"}
                onClick={() => { onNavigate("dashboard"); setActiveProjectId(null) }}
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "tasks" && !activeProjectId}
                onClick={() => { onNavigate("tasks"); setActiveProjectId(null) }}
              >
                <CheckSquare />
                <span>Tarefas</span>
                {activeTasks > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs py-0 px-1.5 h-5">
                    {activeTasks}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "projects"}
                onClick={() => { onNavigate("projects"); setActiveProjectId(null) }}
              >
                <FolderKanban />
                <span>Projetos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Projetos</SidebarGroupLabel>
          <SidebarMenu>
            {projects.map(p => {
              const count = tasks.filter(t => t.projectId === p.id && ACTIVE_STATUSES.includes(t.status)).length
              const isActive = activeProjectId === p.id
              return (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => handleProjectClick(p.id)}
                    className="gap-2"
                  >
                    <ProjectIcon
                      iconKey={p.emoji}
                      className="size-4 shrink-0"
                      style={{ color: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                    {count > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {tasks.filter(t => t.status === "done").length} de {tasks.length} tarefas concluídas
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
