import { useState, useEffect } from "react"
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns"
import type { Task, Project, Status, Comment, ChecklistItem, SavedView, Recurring } from "@/types/task"
import { DEFAULT_PROJECTS, DEMO_TASKS, DEFAULT_SAVED_VIEWS } from "@/types/task"

const TASKS_KEY = "cative-tasks"
const PROJECTS_KEY = "cative-projects"
const VIEWS_KEY = "cative-saved-views"

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}

function entry(text: string) {
  return { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
}

function nextRecurringDate(dateStr: string, recurring: NonNullable<Recurring>): string {
  const d = parseISO(dateStr)
  const next = recurring === "daily" ? addDays(d, 1)
    : recurring === "weekly" ? addWeeks(d, 1)
    : recurring === "biweekly" ? addWeeks(d, 2)
    : addMonths(d, 1)
  return format(next, "yyyy-MM-dd")
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>(() => load(TASKS_KEY, DEMO_TASKS))
  const [projects, setProjects] = useState<Project[]>(() => load(PROJECTS_KEY, DEFAULT_PROJECTS))
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => load(VIEWS_KEY, DEFAULT_SAVED_VIEWS))

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)) }, [projects])
  useEffect(() => { localStorage.setItem(VIEWS_KEY, JSON.stringify(savedViews)) }, [savedViews])

  function addTask(task: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity">) {
    const newTask: Task = {
      ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      comments: [], checklist: [], activity: [entry("Tarefa criada")],
    }
    setTasks(prev => [newTask, ...prev])
    return newTask
  }

  function updateTask(id: string, patch: Partial<Task>, activityText?: string) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...patch }
      if (activityText) updated.activity = [...(t.activity ?? []), entry(activityText)]
      return updated
    }))
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function deleteTasks(ids: string[]) {
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
  }

  function updateTasks(ids: string[], patch: Partial<Task>) {
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...patch } : t))
  }

  function moveTask(id: string, status: Status) {
    const LABELS: Record<Status, string> = { todo: "A Fazer", "in-progress": "Em Andamento", review: "Revisão", done: "Concluído" }
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t
        return { ...t, status, activity: [...(t.activity ?? []), entry(`Status alterado para ${LABELS[status]}`)] }
      })
      // Auto-regenerate recurring tasks when completed
      if (status === "done") {
        const task = prev.find(t => t.id === id)
        if (task?.recurring && task.dueDate) {
          const nextDue = nextRecurringDate(task.dueDate, task.recurring)
          const newTask: Task = {
            ...task, id: crypto.randomUUID(), status: "todo",
            dueDate: nextDue, createdAt: new Date().toISOString(),
            comments: [], checklist: task.checklist.map(i => ({ ...i, done: false })),
            activity: [entry(`Recorrência ${task.recurring} gerada automaticamente`)],
          }
          return [...updated, newTask]
        }
      }
      return updated
    })
  }

  function addComment(taskId: string, text: string) {
    const comment: Comment = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...(t.comments ?? []), comment] } : t))
  }

  function deleteComment(taskId: string, commentId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: t.comments.filter(c => c.id !== commentId) } : t))
  }

  function addChecklistItem(taskId: string, text: string) {
    const item: ChecklistItem = { id: crypto.randomUUID(), text, done: false }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: [...(t.checklist ?? []), item] } : t))
  }

  function toggleChecklistItem(taskId: string, itemId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : t))
  }

  function deleteChecklistItem(taskId: string, itemId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t))
  }

  function addProject(project: Omit<Project, "id">) {
    const p = { ...project, id: crypto.randomUUID() }
    setProjects(prev => [...prev, p])
    return p
  }

  function updateProject(id: string, patch: Partial<Project>) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.projectId !== id))
  }

  function addSavedView(view: Omit<SavedView, "id">) {
    setSavedViews(prev => [...prev, { ...view, id: crypto.randomUUID() }])
  }

  function deleteSavedView(id: string) {
    setSavedViews(prev => prev.filter(v => v.id !== id))
  }

  return {
    tasks, projects, savedViews,
    addTask, updateTask, deleteTask, deleteTasks, updateTasks, moveTask,
    addComment, deleteComment,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    addProject, updateProject, deleteProject,
    addSavedView, deleteSavedView,
  }
}
