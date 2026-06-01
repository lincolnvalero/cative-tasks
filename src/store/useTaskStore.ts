import { useState, useEffect } from "react"
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns"
import type { Task, Project, Status, Comment, ChecklistItem, ActivityEntry, SavedView, Recurring } from "@/types/task"
import { DEFAULT_PROJECTS, DEFAULT_SAVED_VIEWS } from "@/types/task"
import { supabase } from "@/lib/supabase"

// ── Mappers DB → App ──────────────────────────────────────────────────────────

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    emoji: row.emoji as string,
  }
}

function mapTask(
  row: Record<string, unknown>,
  comments: Comment[],
  checklist: ChecklistItem[],
  activity: ActivityEntry[],
): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    status: row.status as Status,
    priority: row.priority as Task["priority"],
    projectId: (row.project_id as string) ?? "",
    dueDate: row.due_date ? (row.due_date as string) : null,
    tags: (row.tags as string[]) ?? [],
    recurring: (row.recurring as Recurring) ?? null,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
    comments,
    checklist,
    activity,
  }
}

function mapComment(row: Record<string, unknown>): Comment {
  return { id: row.id as string, text: row.text as string, createdAt: row.created_at as string }
}

function mapChecklist(row: Record<string, unknown>): ChecklistItem {
  return { id: row.id as string, text: row.text as string, done: row.done as boolean }
}

function mapActivity(row: Record<string, unknown>): ActivityEntry {
  return { id: row.id as string, text: row.text as string, createdAt: row.created_at as string }
}

function mapView(row: Record<string, unknown>): SavedView {
  return { id: row.id as string, name: row.name as string, filters: (row.filters as SavedView["filters"]) ?? {} }
}

// ── Recurring helper ──────────────────────────────────────────────────────────

function nextRecurringDate(dateStr: string, recurring: NonNullable<Recurring>): string {
  const d = parseISO(dateStr)
  const next = recurring === "daily" ? addDays(d, 1)
    : recurring === "weekly" ? addWeeks(d, 1)
    : recurring === "biweekly" ? addWeeks(d, 2)
    : addMonths(d, 1)
  return format(next, "yyyy-MM-dd")
}

// ── Store ─────────────────────────────────────────────────────────────────────

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(true)

  // ── Reorder ────────────────────────────────────────────────────────────────

  async function reorderTasks(orderedIds: string[]) {
    setTasks(prev => {
      const byId = Object.fromEntries(prev.map(t => [t.id, t]))
      const reordered = orderedIds.map((id, i) => ({ ...byId[id], position: i }))
      const rest = prev.filter(t => !orderedIds.includes(t.id))
      return [...reordered, ...rest]
    })
    // Batch update positions in Supabase
    await Promise.all(
      orderedIds.map((id, i) => supabase.from("ct_tasks").update({ position: i }).eq("id", id))
    )
  }

  // Load all data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [
          { data: projRows },
          { data: taskRows },
          { data: commentRows },
          { data: checklistRows },
          { data: activityRows },
          { data: viewRows },
        ] = await Promise.all([
          supabase.from("ct_projects").select("*").order("created_at"),
          supabase.from("ct_tasks").select("*").order("created_at", { ascending: false }),
          supabase.from("ct_task_comments").select("*").order("created_at"),
          supabase.from("ct_task_checklist").select("*").order("position").order("created_at"),
          supabase.from("ct_task_activity").select("*").order("created_at"),
          supabase.from("ct_saved_views").select("*").order("created_at"),
        ])

        const mappedProjects = (projRows ?? []).map(mapProject)
        setProjects(mappedProjects.length ? mappedProjects : DEFAULT_PROJECTS)

        const mappedViews = (viewRows ?? []).map(mapView)
        setSavedViews(mappedViews.length ? mappedViews : DEFAULT_SAVED_VIEWS)

        const commentsByTask: Record<string, Comment[]> = {}
        const checklistByTask: Record<string, ChecklistItem[]> = {}
        const activityByTask: Record<string, ActivityEntry[]> = {}

        for (const r of commentRows ?? []) {
          const tid = r.task_id as string
          if (!commentsByTask[tid]) commentsByTask[tid] = []
          commentsByTask[tid].push(mapComment(r))
        }
        for (const r of checklistRows ?? []) {
          const tid = r.task_id as string
          if (!checklistByTask[tid]) checklistByTask[tid] = []
          checklistByTask[tid].push(mapChecklist(r))
        }
        for (const r of activityRows ?? []) {
          const tid = r.task_id as string
          if (!activityByTask[tid]) activityByTask[tid] = []
          activityByTask[tid].push(mapActivity(r))
        }

        const mappedTasks = (taskRows ?? [])
          .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
          .map(r => mapTask(r, commentsByTask[r.id as string] ?? [], checklistByTask[r.id as string] ?? [], activityByTask[r.id as string] ?? []))
        setTasks(mappedTasks)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async function addTask(taskData: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity">) {
    const { data, error } = await supabase.from("ct_tasks").insert({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      project_id: taskData.projectId || null,
      due_date: taskData.dueDate || null,
      tags: taskData.tags,
      recurring: taskData.recurring || null,
      position: taskData.position ?? 0,
    }).select().single()

    if (error || !data) return

    // Insert initial activity
    const { data: actRow } = await supabase.from("ct_task_activity").insert({ task_id: data.id, text: "Tarefa criada" }).select().single()
    const newTask = mapTask(data, [], [], actRow ? [mapActivity(actRow)] : [])
    setTasks(prev => [newTask, ...prev])
    return newTask
  }

  async function updateTask(id: string, patch: Partial<Task>, activityText?: string) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.description !== undefined) dbPatch.description = patch.description
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.priority !== undefined) dbPatch.priority = patch.priority
    if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId || null
    if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate || null
    if (patch.tags !== undefined) dbPatch.tags = patch.tags
    if (patch.recurring !== undefined) dbPatch.recurring = patch.recurring || null

    if (Object.keys(dbPatch).length > 0) {
      await supabase.from("ct_tasks").update(dbPatch).eq("id", id)
    }

    let newActivityEntry: ActivityEntry | undefined
    if (activityText) {
      const { data } = await supabase.from("ct_task_activity").insert({ task_id: id, text: activityText }).select().single()
      if (data) newActivityEntry = mapActivity(data)
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...patch }
      if (newActivityEntry) updated.activity = [...(t.activity ?? []), newActivityEntry]
      return updated
    }))
  }

  async function deleteTask(id: string) {
    await supabase.from("ct_tasks").delete().eq("id", id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function deleteTasks(ids: string[]) {
    await supabase.from("ct_tasks").delete().in("id", ids)
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
  }

  async function updateTasks(ids: string[], patch: Partial<Task>) {
    const dbPatch: Record<string, unknown> = {}
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.priority !== undefined) dbPatch.priority = patch.priority
    if (Object.keys(dbPatch).length > 0) {
      await supabase.from("ct_tasks").update(dbPatch).in("id", ids)
    }
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...patch } : t))
  }

  async function moveTask(id: string, status: Status) {
    const LABELS: Record<Status, string> = { todo: "A Fazer", "in-progress": "Em Andamento", review: "Revisão", done: "Concluído" }
    await supabase.from("ct_tasks").update({ status }).eq("id", id)
    const { data: actRow } = await supabase.from("ct_task_activity").insert({ task_id: id, text: `Status alterado para ${LABELS[status]}` }).select().single()
    const entry = actRow ? mapActivity(actRow) : undefined

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t
        return { ...t, status, activity: [...(t.activity ?? []), ...(entry ? [entry] : [])] }
      })

      // Recurring: regenerate on completion
      if (status === "done") {
        const task = prev.find(t => t.id === id)
        if (task?.recurring && task.dueDate) {
          const nextDue = nextRecurringDate(task.dueDate, task.recurring)
          // Insert new task async
          supabase.from("ct_tasks").insert({
            title: task.title, description: task.description, status: "todo",
            priority: task.priority, project_id: task.projectId || null,
            due_date: nextDue, tags: task.tags, recurring: task.recurring,
          }).select().single().then(({ data }) => {
            if (!data) return
            supabase.from("ct_task_activity").insert({ task_id: data.id, text: "Recorrência gerada automaticamente" }).select().single().then(({ data: actR }) => {
              const resetChecklist = task.checklist.map(i => ({ ...i, id: crypto.randomUUID(), done: false }))
              const newTask = mapTask(data, [], resetChecklist, actR ? [mapActivity(actR)] : [])
              setTasks(p => [newTask, ...p])
            })
          })
        }
      }
      return updated
    })
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async function addComment(taskId: string, text: string) {
    const { data } = await supabase.from("ct_task_comments").insert({ task_id: taskId, text }).select().single()
    if (!data) return
    const comment = mapComment(data)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...(t.comments ?? []), comment] } : t))
  }

  async function deleteComment(taskId: string, commentId: string) {
    await supabase.from("ct_task_comments").delete().eq("id", commentId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: t.comments.filter(c => c.id !== commentId) } : t))
  }

  // ── Checklist ──────────────────────────────────────────────────────────────

  async function addChecklistItem(taskId: string, text: string) {
    const { data } = await supabase.from("ct_task_checklist").insert({ task_id: taskId, text, done: false, position: 0 }).select().single()
    if (!data) return
    const item = mapChecklist(data)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: [...(t.checklist ?? []), item] } : t))
  }

  async function toggleChecklistItem(taskId: string, itemId: string) {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)
      const item = task?.checklist.find(i => i.id === itemId)
      if (item) supabase.from("ct_task_checklist").update({ done: !item.done }).eq("id", itemId)
      return prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : t)
    })
  }

  async function deleteChecklistItem(taskId: string, itemId: string) {
    await supabase.from("ct_task_checklist").delete().eq("id", itemId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t))
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  async function addProject(projectData: Omit<Project, "id">) {
    const { data } = await supabase.from("ct_projects").insert({ name: projectData.name, color: projectData.color, emoji: projectData.emoji }).select().single()
    if (!data) return
    const p = mapProject(data)
    setProjects(prev => [...prev, p])
    return p
  }

  async function updateProject(id: string, patch: Partial<Project>) {
    await supabase.from("ct_projects").update({ name: patch.name, color: patch.color, emoji: patch.emoji }).eq("id", id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  async function deleteProject(id: string) {
    await supabase.from("ct_projects").delete().eq("id", id)
    setProjects(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.projectId !== id))
  }

  // ── Saved Views ────────────────────────────────────────────────────────────

  async function addSavedView(view: Omit<SavedView, "id">) {
    const { data } = await supabase.from("ct_saved_views").insert({ name: view.name, filters: view.filters }).select().single()
    if (!data) return
    setSavedViews(prev => [...prev, mapView(data)])
  }

  async function deleteSavedView(id: string) {
    await supabase.from("ct_saved_views").delete().eq("id", id)
    setSavedViews(prev => prev.filter(v => v.id !== id))
  }

  return {
    tasks, projects, savedViews, loading,
    reorderTasks,
    addTask, updateTask, deleteTask, deleteTasks, updateTasks, moveTask,
    addComment, deleteComment,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    addProject, updateProject, deleteProject,
    addSavedView, deleteSavedView,
  }
}
