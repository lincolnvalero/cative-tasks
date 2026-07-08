import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useTaskStore } from "@/store/useTaskStore"
import { useMembersStore } from "@/store/useMembersStore"
import type { Task, Project, Status, SavedView, Workspace, Member } from "@/types/task"

interface AppContextValue {
  tasks: Task[]
  projects: Project[]
  savedViews: SavedView[]
  loading: boolean
  saving: boolean
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  activeWorkspace: Workspace | "all"
  setActiveWorkspace: (w: Workspace | "all") => void
  addTask: (task: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity" | "links">) => Promise<Task | undefined>
  reorderTasks: (orderedIds: string[]) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>, activityText?: string) => void
  deleteTask: (id: string) => void
  deleteTasks: (ids: string[]) => void
  updateTasks: (ids: string[], patch: Partial<Task>) => void
  moveTask: (id: string, status: Status) => void
  addComment: (taskId: string, text: string) => void
  deleteComment: (taskId: string, commentId: string) => void
  addChecklistItem: (taskId: string, text: string) => void
  toggleChecklistItem: (taskId: string, itemId: string) => void
  deleteChecklistItem: (taskId: string, itemId: string) => void
  addProject: (project: Omit<Project, "id">) => Promise<Project | undefined>
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addSavedView: (view: Omit<SavedView, "id">) => void
  deleteSavedView: (id: string) => void
  addTaskLink: (taskId: string, title: string, url: string) => void
  deleteTaskLink: (taskId: string, linkId: string) => void
  duplicateTask: (id: string) => Promise<Task | undefined>
  // Members
  members: Member[]
  membersLoading: boolean
  addMember: (name: string) => Promise<Member | undefined>
  removeMember: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useTaskStore()
  const membersStore = useMembersStore()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | "all">("all")

  useEffect(() => { membersStore.fetchMembers() }, [])

  function handleSetWorkspace(w: Workspace | "all") {
    setActiveWorkspace(w)
    localStorage.setItem("lincoln-workspace", w)
  }

  return (
    <AppContext.Provider value={{
      ...store,
      activeProjectId, setActiveProjectId,
      activeWorkspace, setActiveWorkspace: handleSetWorkspace,
      members: membersStore.members,
      membersLoading: membersStore.loading,
      addMember: membersStore.addMember,
      removeMember: membersStore.removeMember,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
