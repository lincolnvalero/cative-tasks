import { createContext, useContext, useState, type ReactNode } from "react"
import { useTaskStore } from "@/store/useTaskStore"
import type { Task, Project, Status, SavedView } from "@/types/task"

interface AppContextValue {
  tasks: Task[]
  projects: Project[]
  savedViews: SavedView[]
  loading: boolean
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  addTask: (task: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity">) => Promise<Task | undefined>
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
  addProject: (project: Omit<Project, "id">) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addSavedView: (view: Omit<SavedView, "id">) => void
  deleteSavedView: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useTaskStore()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  return (
    <AppContext.Provider value={{ ...store, activeProjectId, setActiveProjectId }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
