import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/context/AppContext"
import type { Status } from "@/types/task"
import { LayoutDashboard, CheckSquare, FolderKanban, Zap, StickyNote, User, Building2, LayoutList, PanelLeftClose, PanelLeftOpen, Users, MicVocal, Inbox } from "lucide-react"
import { ProjectIcon } from "@/components/ProjectIcon"

function CollapseButton() {
  const { toggleSidebar, open } = useSidebar()
  return (
    <button
      onClick={toggleSidebar}
      className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
      title={open ? "Recolher menu" : "Expandir menu"}
    >
      {open ? (
        <>
          <PanelLeftClose className="size-4 shrink-0" />
          <span>Recolher menu</span>
        </>
      ) : (
        <PanelLeftOpen className="size-4 shrink-0" />
      )}
    </button>
  )
}

type Page = "dashboard" | "tasks" | "projects" | "notes" | "collaborators" | "singing" | "inbox"

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-2 px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="size-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Lincoln General System</p>
              <p className="text-xs text-muted-foreground">Gestão pessoal</p>
            </div>
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
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "notes"}
                onClick={() => { onNavigate("notes"); setActiveProjectId(null) }}
              >
                <StickyNote />
                <span>Notas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "singing"}
                onClick={() => { onNavigate("singing"); setActiveProjectId(null) }}
              >
                <MicVocal />
                <span>Canto</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "inbox"}
                onClick={() => { onNavigate("inbox"); setActiveProjectId(null) }}
              >
                <Inbox />
                <span>Inbox</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Projetos</SidebarGroupLabel>
          <SidebarMenu>
            {/* Todos */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "tasks" && !activeProjectId}
                onClick={() => { setActiveProjectId(null); onNavigate("tasks") }}
                className="gap-2"
              >
                <LayoutList className="size-4 shrink-0" />
                <span>Todos</span>
                {activeTasks > 0 && <span className="ml-auto text-xs text-muted-foreground">{activeTasks}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Pessoal */}
            {projects.filter(p => p.workspace === "personal").length > 0 && (
              <div className="px-2 pt-1 pb-0.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  <User className="size-2.5" /> Pessoal
                </span>
              </div>
            )}
            {projects.filter(p => p.workspace === "personal").map(p => {
              const count = tasks.filter(t => t.projectId === p.id && ACTIVE_STATUSES.includes(t.status)).length
              const isActive = activeProjectId === p.id
              return (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton isActive={isActive} onClick={() => handleProjectClick(p.id)} className="gap-2">
                    <ProjectIcon iconKey={p.emoji} className="size-4 shrink-0" style={{ color: p.color }} />
                    <span className="truncate">{p.name}</span>
                    {count > 0 && <span className="ml-auto text-xs text-muted-foreground">{count}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Divisor sutil se há projetos dos dois tipos */}
            {projects.filter(p => p.workspace === "personal").length > 0 &&
             projects.filter(p => p.workspace === "cative").length > 0 && (
              <div className="px-2 pt-2 pb-0.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  <Building2 className="size-2.5" /> Cative
                </span>
              </div>
            )}

            {/* Cative (ou sem label se só há Cative) */}
            {projects.filter(p => p.workspace === "personal").length === 0 &&
             projects.filter(p => p.workspace === "cative").length > 0 && (
              <div className="px-2 pt-1 pb-0.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  <Building2 className="size-2.5" /> Cative
                </span>
              </div>
            )}

            {projects.filter(p => p.workspace === "cative" || !p.workspace).map(p => {
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
        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "collaborators"}
                onClick={() => { onNavigate("collaborators"); setActiveProjectId(null) }}
              >
                <Users />
                <span>Colaboradores</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {tasks.filter(t => t.status === "done").length} de {tasks.length} tarefas concluídas
        </div>
        <CollapseButton />
      </SidebarFooter>
    </Sidebar>
  )
}
