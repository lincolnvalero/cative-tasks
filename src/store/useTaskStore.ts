import { useState, useEffect } from "react"
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns"
import { toast } from "sonner"
import type { Task, Project, Status, Comment, ChecklistItem, ActivityEntry, Recurring, TaskLink } from "@/types/task"
import { supabase } from "@/lib/supabase"

// ── Mappers DB → App ──────────────────────────────────────────────────────────

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    emoji: row.emoji as string,
    suspended: !!row.suspended,
    createdBy: (row.created_by as string) ?? null,
  }
}

function mapTask(
  row: Record<string, unknown>,
  comments: Comment[],
  checklist: ChecklistItem[],
  activity: ActivityEntry[],
  links: TaskLink[],
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
    links,
    assignee: (row.assignee as string) ?? null,
  }
}

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    text: row.text as string,
    authorId: (row.author_id as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapChecklist(row: Record<string, unknown>): ChecklistItem {
  return { id: row.id as string, text: row.text as string, done: row.done as boolean }
}

function mapActivity(row: Record<string, unknown>): ActivityEntry {
  return { id: row.id as string, text: row.text as string, createdAt: row.created_at as string }
}

function mapTaskLink(row: Record<string, unknown>): TaskLink {
  return { id: row.id as string, title: row.title as string, url: row.url as string }
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
      orderedIds.map((id, i) => supabase.from("lt_tasks").update({ position: i }).eq("id", id))
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
          { data: linkRows },
        ] = await Promise.all([
          supabase.from("lt_projects").select("*").order("created_at"),
          supabase.from("lt_tasks").select("*").order("created_at", { ascending: false }),
          supabase.from("lt_task_comments").select("*").order("created_at"),
          supabase.from("lt_task_checklist").select("*").order("position").order("created_at"),
          supabase.from("lt_task_activity").select("*").order("created_at"),
          supabase.from("lt_task_links").select("*").order("created_at"),
        ])

        setProjects((projRows ?? []).map(mapProject))

        const commentsByTask: Record<string, Comment[]> = {}
        const checklistByTask: Record<string, ChecklistItem[]> = {}
        const activityByTask: Record<string, ActivityEntry[]> = {}
        const linksByTask: Record<string, TaskLink[]> = {}

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
        for (const r of linkRows ?? []) {
          const tid = r.task_id as string
          if (!linksByTask[tid]) linksByTask[tid] = []
          linksByTask[tid].push(mapTaskLink(r))
        }

        const mappedTasks = (taskRows ?? [])
          .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
          .map(r => mapTask(r, commentsByTask[r.id as string] ?? [], checklistByTask[r.id as string] ?? [], activityByTask[r.id as string] ?? [], linksByTask[r.id as string] ?? []))
        setTasks(mappedTasks)

        // Subscribe to realtime changes
        const taskSubscription = supabase
          .channel('lt_tasks_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'lt_tasks' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
              setTasks(prev => prev.map(t => t.id === payload.new.id ? mapTask(payload.new, commentsByTask[payload.new.id] ?? [], checklistByTask[payload.new.id] ?? [], activityByTask[payload.new.id] ?? [], linksByTask[payload.new.id] ?? []) : t))
            } else if (payload.eventType === 'INSERT') {
              const newTask = mapTask(payload.new, [], [], [], [])
              setTasks(prev => [newTask, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.filter(t => t.id !== payload.old.id))
            }
          })
          .subscribe()

        // Chat por tarefa — comentários chegam ao vivo pra todo mundo com a tarefa aberta
        const commentSubscription = supabase
          .channel('lt_task_comments_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'lt_task_comments' }, (payload) => {
            if (payload.eventType === 'INSERT') {
              const comment = mapComment(payload.new)
              setTasks(prev => prev.map(t => t.id !== payload.new.task_id
                ? t
                : { ...t, comments: t.comments.some(c => c.id === comment.id) ? t.comments : [...t.comments, comment] }))
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.map(t => t.id !== payload.old.task_id
                ? t
                : { ...t, comments: t.comments.filter(c => c.id !== payload.old.id) }))
            }
          })
          .subscribe()

        return () => {
          taskSubscription.unsubscribe()
          commentSubscription.unsubscribe()
        }
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async function addTask(taskData: Omit<Task, "id" | "createdAt" | "comments" | "checklist" | "activity" | "links">) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("lt_tasks").insert({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        project_id: taskData.projectId || null,
        due_date: taskData.dueDate || null,
        tags: taskData.tags,
        recurring: taskData.recurring || null,
        position: taskData.position ?? 0,
        assignee: taskData.assignee || null,
      }).select().single()

      if (error || !data) {
        toast.error("Erro ao criar tarefa")
        return
      }

      // Insert initial activity
      const { data: actRow } = await supabase.from("lt_task_activity").insert({ task_id: data.id, text: "Tarefa criada" }).select().single()
      const newTask = mapTask(data, [], [], actRow ? [mapActivity(actRow)] : [], [])
      setTasks(prev => [newTask, ...prev])
      return newTask
    } finally {
      setSaving(false)
    }
  }

  async function updateTask(id: string, patch: Partial<Task>, activityText?: string): Promise<boolean> {
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
      if (patch.assignee !== undefined) dbPatch.assignee = patch.assignee || null

      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase.from("lt_tasks").update(dbPatch).eq("id", id)
        if (error) {
          toast.error("Erro ao atualizar tarefa")
          return false
        }
      }

      let newActivityEntry: ActivityEntry | undefined
      if (activityText) {
        const { data, error } = await supabase.from("lt_task_activity").insert({ task_id: id, text: activityText }).select().single()
        if (error) {
          toast.error("Erro ao registrar atividade")
          return false
        }
        if (data) newActivityEntry = mapActivity(data)
      }

      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t
        const updated = { ...t, ...patch }
        if (newActivityEntry) updated.activity = [...(t.activity ?? []), newActivityEntry]
        return updated
      }))
      return true
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
            const { error } = await supabase.from("lt_tasks").delete().eq("id", id)
            if (error) toast.error("Erro ao excluir tarefa")
          }
        },
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteTasks(ids: string[]): Promise<boolean> {
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_tasks").delete().in("id", ids)
      if (error) {
        toast.error("Erro ao excluir tarefas")
        return false
      }
      setTasks(prev => prev.filter(t => !ids.includes(t.id)))
      return true
    } finally {
      setSaving(false)
    }
  }

  async function updateTasks(ids: string[], patch: Partial<Task>): Promise<boolean> {
    try {
      setSaving(true)
      const dbPatch: Record<string, unknown> = {}
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.priority !== undefined) dbPatch.priority = patch.priority
      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase.from("lt_tasks").update(dbPatch).in("id", ids)
        if (error) {
          toast.error("Erro ao atualizar tarefas")
          return false
        }
      }
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...patch } : t))
      return true
    } finally {
      setSaving(false)
    }
  }

  async function moveTask(id: string, status: Status): Promise<boolean> {
    try {
      setSaving(true)
      const LABELS: Record<Status, string> = { todo: "A Fazer", "in-progress": "Em Andamento", review: "Revisão", done: "Concluído" }
      const { error } = await supabase.from("lt_tasks").update({ status }).eq("id", id)
      if (error) {
        toast.error("Erro ao atualizar status")
        return false
      }

      const { data: actRow } = await supabase.from("lt_task_activity").insert({ task_id: id, text: `Status alterado para ${LABELS[status]}` }).select().single()
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
            supabase.from("lt_tasks").insert({
              title: task.title, description: task.description, status: "todo",
              priority: task.priority, project_id: task.projectId || null,
              due_date: nextDue, tags: task.tags, recurring: task.recurring,
            }).select().single().then(({ data }) => {
              if (!data) return
              supabase.from("lt_task_activity").insert({ task_id: data.id, text: "Recorrência gerada automaticamente" }).select().single().then(({ data: actR }) => {
                const resetChecklist = task.checklist.map(i => ({ ...i, id: crypto.randomUUID(), done: false }))
                const newTask = mapTask(data, [], resetChecklist, actR ? [mapActivity(actR)] : [], [])
                setTasks(p => [newTask, ...p])
              })
            })
          }
        }
        return updated
      })
      return true
    } finally {
      setSaving(false)
    }
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async function addComment(taskId: string, text: string): Promise<boolean> {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from("lt_task_comments")
        .insert({ task_id: taskId, text, author_id: user?.id ?? null }).select().single()
      if (error || !data) {
        toast.error("Erro ao adicionar comentário")
        return false
      }
      const comment = mapComment(data)
      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, comments: t.comments.some(c => c.id === comment.id) ? t.comments : [...(t.comments ?? []), comment] }
        : t))
      return true
    } finally {
      setSaving(false)
    }
  }

  async function deleteComment(taskId: string, commentId: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_task_comments").delete().eq("id", commentId)
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
      const currentLength = tasks.find(t => t.id === taskId)?.checklist.length ?? 0
      const { data, error } = await supabase.from("lt_task_checklist").insert({ task_id: taskId, text, done: false, position: currentLength }).select().single()
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
      if (!task || !item) return

      const newDone = !item.done
      const { error } = await supabase.from("lt_task_checklist").update({ done: newDone }).eq("id", itemId)
      if (error) {
        toast.error("Erro ao atualizar item")
        return
      }

      const updatedChecklist = task.checklist.map(i => i.id === itemId ? { ...i, done: newDone } : i)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: updatedChecklist } : t))

      const allDone = updatedChecklist.length > 0 && updatedChecklist.every(i => i.done)
      if (allDone && task.status !== "done") {
        await moveTask(taskId, "done")
      }
    } finally {
      setSaving(false)
    }
  }

  async function updateChecklistItem(taskId: string, itemId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_task_checklist").update({ text: trimmed }).eq("id", itemId)
      if (error) {
        toast.error("Erro ao atualizar item")
        return
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, text: trimmed } : i) } : t))
    } finally {
      setSaving(false)
    }
  }

  async function deleteChecklistItem(taskId: string, itemId: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_task_checklist").delete().eq("id", itemId)
      if (error) {
        toast.error("Erro ao excluir item")
        return
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t))
    } finally {
      setSaving(false)
    }
  }

  async function reorderChecklist(taskId: string, orderedIds: string[]) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const byId = Object.fromEntries(t.checklist.map(i => [i.id, i]))
      return { ...t, checklist: orderedIds.map(id => byId[id]) }
    }))
    await Promise.all(
      orderedIds.map((id, i) => supabase.from("lt_task_checklist").update({ position: i }).eq("id", id))
    )
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  async function addProject(projectData: Omit<Project, "id" | "createdBy" | "suspended">) {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from("lt_projects").insert({
        name: projectData.name, color: projectData.color, emoji: projectData.emoji,
        created_by: user?.id ?? null,
      }).select().single()
      if (error || !data) {
        toast.error("Erro ao criar projeto")
        return
      }
      if (user) {
        await supabase.from("lt_project_members").insert({ project_id: data.id, user_id: user.id, role: "owner" })
      }
      const p = mapProject(data)
      setProjects(prev => [...prev, p])
      return p
    } finally {
      setSaving(false)
    }
  }

  async function updateProject(id: string, patch: Partial<Project>): Promise<boolean> {
    try {
      setSaving(true)
      const dbPatch: Record<string, unknown> = {}
      if (patch.name !== undefined) dbPatch.name = patch.name
      if (patch.color !== undefined) dbPatch.color = patch.color
      if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji
      if (patch.suspended !== undefined) dbPatch.suspended = patch.suspended
      const { error } = await supabase.from("lt_projects").update(dbPatch).eq("id", id)
      if (error) {
        toast.error(patch.suspended !== undefined ? "Só administradores podem suspender/reativar um projeto" : "Erro ao atualizar projeto")
        return false
      }
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
      return true
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_projects").delete().eq("id", id)
      if (error) {
        toast.error("Erro ao excluir projeto")
        return false
      }
      setProjects(prev => prev.filter(p => p.id !== id))
      setTasks(prev => prev.filter(t => t.projectId !== id))
      return true
    } finally {
      setSaving(false)
    }
  }

  // ── Task Links ─────────────────────────────────────────────────────────────

  async function addTaskLink(taskId: string, title: string, url: string) {
    try {
      setSaving(true)
      const { data, error } = await supabase.from("lt_task_links").insert({ task_id: taskId, title, url }).select().single()
      if (error || !data) {
        toast.error("Erro ao adicionar link")
        return
      }
      const link = mapTaskLink(data)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, links: [...(t.links ?? []), link] } : t))
    } finally {
      setSaving(false)
    }
  }

  async function deleteTaskLink(taskId: string, linkId: string) {
    try {
      setSaving(true)
      const { error } = await supabase.from("lt_task_links").delete().eq("id", linkId)
      if (error) {
        toast.error("Erro ao excluir link")
        return
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, links: t.links.filter(l => l.id !== linkId) } : t))
    } finally {
      setSaving(false)
    }
  }

  // ── Duplicate Task ─────────────────────────────────────────────────────────

  async function duplicateTask(id: string): Promise<Task | undefined> {
    try {
      setSaving(true)
      const task = tasks.find(t => t.id === id)
      if (!task) {
        toast.error("Tarefa não encontrada")
        return
      }

      const { data, error } = await supabase.from("lt_tasks").insert({
        title: `Cópia de ${task.title}`,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.projectId || null,
        due_date: task.dueDate || null,
        tags: task.tags,
        recurring: task.recurring || null,
        position: 0,
        assignee: task.assignee || null,
      }).select().single()

      if (error || !data) {
        toast.error("Erro ao duplicar tarefa")
        return
      }

      // Insert activity entry
      const { data: actRow } = await supabase.from("lt_task_activity").insert({
        task_id: data.id,
        text: `Tarefa duplicada de "${task.title}"`
      }).select().single()

      // Duplicate checklist items
      const resetChecklist = task.checklist.map(item => ({
        task_id: data.id,
        text: item.text,
        done: false,
        position: task.checklist.indexOf(item),
      }))

      if (resetChecklist.length > 0) {
        await supabase.from("lt_task_checklist").insert(resetChecklist)
      }

      const newTask = mapTask(data, [], task.checklist.map((item) => ({ ...item, done: false })), actRow ? [mapActivity(actRow)] : [], [])
      setTasks(prev => [newTask, ...prev])
      return newTask
    } finally {
      setSaving(false)
    }
  }

  return {
    tasks, projects, loading, saving,
    reorderTasks,
    addTask, updateTask, deleteTask, deleteTasks, updateTasks, moveTask,
    addComment, deleteComment,
    addChecklistItem, toggleChecklistItem, updateChecklistItem, deleteChecklistItem, reorderChecklist,
    addProject, updateProject, deleteProject,
    addTaskLink, deleteTaskLink,
    duplicateTask,
  }
}
