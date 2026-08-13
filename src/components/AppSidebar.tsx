import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useApp } from "@/context/AppContext"
import type { Status, Member } from "@/types/task"
import { LayoutDashboard, CheckSquare, FolderKanban, StickyNote, User, Building2, LayoutList, PanelLeftClose, PanelLeftOpen, Users, MicVocal, Inbox, ChevronsUpDown } from "lucide-react"
import { ProjectIcon } from "@/components/ProjectIcon"
import { MemberAvatar } from "@/components/MemberAvatar"

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
  isAdmin: boolean
  currentMember: Member | null
  onChangeCurrentMember: (id: string | null) => void
}

const ACTIVE_STATUSES: Status[] = ["todo", "in-progress", "review"]

export function AppSidebar({ page, onNavigate, isAdmin, currentMember, onChangeCurrentMember }: Props) {
  const { tasks, projects, members, activeProjectId, setActiveProjectId } = useApp()

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
            <img src="/logo.svg" alt="" className="size-8 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Tasks System</p>
              <p className="text-xs text-muted-foreground">Gestão de Projetos</p>
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
            {isAdmin && (
              <>
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
              </>
            )}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full h-9 rounded-lg flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border group-data-[collapsible=icon]:justify-center"
              title="Quem é você?"
            >
              {currentMember ? (
                <MemberAvatar member={currentMember} size="xs" />
              ) : (
                <User className="size-4 shrink-0" />
              )}
              <span className="flex-1 text-left truncate group-data-[collapsible=icon]:hidden">
                {currentMember ? currentMember.name : "Quem é você?"}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {members.map(m => (
              <DropdownMenuItem key={m.id} onClick={() => onChangeCurrentMember(m.id)} className="gap-2">
                <MemberAvatar member={m} size="xs" />
                <span className="flex-1">{m.name}</span>
                {currentMember?.id === m.id && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
            {currentMember && (
              <DropdownMenuItem onClick={() => onChangeCurrentMember(null)} className="text-muted-foreground">
                Sair da identidade
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <CollapseButton />
      </SidebarFooter>
    </Sidebar>
  )
}
