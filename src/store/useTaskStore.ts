import { useState, useEffect } from "react"
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns"
import { toast } from "sonner"
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
  const [saving, setSaving] = useState(false)

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

        // Subscribe to realtime changes
        const taskSubscription = supabase
          .channel('ct_tasks_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_tasks' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
              setTasks(prev => prev.map(t => t.id === payload.new.id ? mapTask(payload.new, commentsByTask[payload.new.id] ?? [], checklistByTask[payload.new.id] ?? [], activityByTask[payload.new.id] ?? []) : t))
            } else if (payload.eventType === 'INSERT') {
              const newTask = mapTask(payload.new, [], [], [])
              setTasks(prev => [newTask, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.filter(t => t.id !== payload.old.id))
            }
          })
          .subscribe()

        return () => {
          taskSubscription.unsubscribe()
        }
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async function addTask(taskData: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity">) {
    try {
      setSaving(true)
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

      if (error || !data) {
        toast.error("Erro ao criar tarefa")
        return
      }

      // Insert initial activity
      const { data: actRow } = await supabase.from("ct_task_activity").insert({ task_id: data.id, text: "Tarefa criada" }).select().single()
      const newTask = mapTask(data, [], [], actRow ? [mapActivity(actRow)] : [])
      setTasks(prev => [newTask, ...prev])
      return newTask
    } finally {
      setSaving(false)
    }
  }

  async function updateTask(id: string, patch: Partial<Task>, activityText?: string) {
    try {
      setSaving(true)
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
        const { error } = await supabase.from("ct_tasks").update(dbPatch).eq("id", id)
        if (error) {
          toast.error("Erro ao atualizar tarefa")
          return
        }
      }

      let newActivityEntry: ActivityEntry | undefined
      if (activityText) {
        const { data, error } = await supabase.from("ct_task_activity").insert({ task_id: id, text: activityText }).select().single()
        if (error) {
          toast.error("Erro ao registrar atividade")
          return
        }
        if (data) newActivityEntry = mapActivity(data)
      }

      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t
        const updated = { ...t, ...patch }
        if (newActivityEntry) updated.activity = [...(t.activity ?? []), newActivityEntry]
        return updated
      }))
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask(id: string) {
    const taskToDelete = tasks.find(t => t.id === id)
    if (!taskToDelete) return

    try {
      setSaving(true)
      // Remove from UI immediately
      setTasks(prev => prev.filter(t => t.id !== id))

      // Show toast with undo option
      let undone = false
      toast.success("Tarefa excluída", {
        description: "Desfazer",
        action: {
          label: "Desfazer",
          onClick: () => {
            undone = true
            setTasks(prev => [taskToDelete, ...prev])
          },
        },
        duration: 5000,
        onDismiss: async () => {
          if (!undone) {
            // Perform actual deletion after 5 seconds
            const { error } = await supabase.from("ct_tasks").delete().eq("id", id)
            if (error) toast.error("Erro ao excluir tarefa")
          }
        },
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteTasks(ids: string[]) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_tasks").delete().in("id", ids)
      if (error) {
        toast.error("Erro ao excluir tarefas")
        return
      }
      setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    } finally {
      setSaving(false)
    }
  }

  async function updateTasks(ids: string[], patch: Partial<Task>) {
    try {
      setSaving(true)
      const dbPatch: Record<string, unknown> = {}
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.priority !== undefined) dbPatch.priority = patch.priority
      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase.from("ct_tasks").update(dbPatch).in("id", ids)
        if (error) {
          toast.error("Erro ao atualizar tarefas")
          return
        }
      }
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...patch } : t))
    } finally {
      setSaving(false)
    }
  }

  async function moveTask(id: string, status: Status) {
    try {
      setSaving(true)
      const LABELS: Record<Status, string> = { todo: "A Fazer", "in-progress": "Em Andamento", review: "Revisão", done: "Concluído" }
      const { error } = await supabase.from("ct_tasks").update({ status }).eq("id", id)
      if (error) {
        toast.error("Erro ao atualizar status")
        return
      }

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
    } finally {
      setSaving(false)
    }
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async function addComment(taskId: string, text: string) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("ct_task_comments").insert({ task_id: taskId, text }).select().single()
      if (error || !data) {
        toast.error("Erro ao adicionar comentário")
        return
      }
      const comment = mapComment(data)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...(t.comments ?? []), comment] } : t))
    } finally {
      setSaving(false)
    }
  }

  async function deleteComment(taskId: string, commentId: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_task_comments").delete().eq("id", commentId)
      if (error) {
        toast.error("Erro ao excluir comentário")
        return
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: t.comments.filter(c => c.id !== commentId) } : t))
    } finally {
      setSaving(false)
    }
  }

  // ── Checklist ──────────────────────────────────────────────────────────────

  async function addChecklistItem(taskId: string, text: string) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("ct_task_checklist").insert({ task_id: taskId, text, done: false, position: 0 }).select().single()
      if (error || !data) {
        toast.error("Erro ao adicionar item")
        return
      }
      const item = mapChecklist(data)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: [...(t.checklist ?? []), item] } : t))
    } finally {
      setSaving(false)
    }
  }

  async function toggleChecklistItem(taskId: string, itemId: string) {
    try {
      setSaving(true)
      const task = tasks.find(t => t.id === taskId)
      const item = task?.checklist.find(i => i.id === itemId)
      if (!item) return

      const newDone = !item.done
      const { error } = await supabase.from("ct_task_checklist").update({ done: newDone }).eq("id", itemId)
      if (error) {
        toast.error("Erro ao atualizar item")
        return
      }

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: newDone } : i) } : t))
    } finally {
      setSaving(false)
    }
  }

  async function deleteChecklistItem(taskId: string, itemId: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_task_checklist").delete().eq("id", itemId)
      if (error) {
        toast.error("Erro ao excluir item")
        return
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t))
    } finally {
      setSaving(false)
    }
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  async function addProject(projectData: Omit<Project, "id">) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("ct_projects").insert({ name: projectData.name, color: projectData.color, emoji: projectData.emoji }).select().single()
      if (error || !data) {
        toast.error("Erro ao criar projeto")
        return
      }
      const p = mapProject(data)
      setProjects(prev => [...prev, p])
      return p
    } finally {
      setSaving(false)
    }
  }

  async function updateProject(id: string, patch: Partial<Project>) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_projects").update({ name: patch.name, color: patch.color, emoji: patch.emoji }).eq("id", id)
      if (error) {
        toast.error("Erro ao atualizar projeto")
        return
      }
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_projects").delete().eq("id", id)
      if (error) {
        toast.error("Erro ao excluir projeto")
        return
      }
      setProjects(prev => prev.filter(p => p.id !== id))
      setTasks(prev => prev.filter(t => t.projectId !== id))
    } finally {
      setSaving(false)
    }
  }

  // ── Saved Views ────────────────────────────────────────────────────────────

  async function addSavedView(view: Omit<SavedView, "id">) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("ct_saved_views").insert({ name: view.name, filters: view.filters }).select().single()
      if (error || !data) {
        toast.error("Erro ao criar vista")
        return
      }
      setSavedViews(prev => [...prev, mapView(data)])
    } finally {
      setSaving(false)
    }
  }

  async function deleteSavedView(id: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("ct_saved_views").delete().eq("id", id)
      if (error) {
        toast.error("Erro ao excluir vista")
        return
      }
      setSavedViews(prev => prev.filter(v => v.id !== id))
    } finally {
      setSaving(false)
    }
  }

  return {
    tasks, projects, savedViews, loading, saving,
    reorderTasks,
    addTask, updateTask, deleteTask, deleteTasks, updateTasks, moveTask,
    addComment, deleteComment,
    addChecklistItem, toggleChecklistItem, deleteChecklistItem,
    addProject, updateProject, deleteProject,
    addSavedView, deleteSavedView,
  }
}
