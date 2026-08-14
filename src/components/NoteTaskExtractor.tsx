import { useState } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/context/AppContext"
import { PRIORITY_CONFIG } from "@/types/task"
import type { Priority } from "@/types/task"
import type { ExtractedTask } from "@/lib/noteTaskExtractor"
import { Sparkles, Check, X, ListChecks, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  open: boolean
  onClose: () => void
  noteTitle: string
  tasks: ExtractedTask[]
  onTasksChange: (tasks: ExtractedTask[]) => void
}

export function NoteTaskExtractor({ open, onClose, noteTitle, tasks, onTasksChange }: Props) {
  const { projects, addTask, tasks: existingTasks } = useApp()
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id ?? "")
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium")
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const selectedCount = tasks.filter(t => t.selected).length

  // Verifica se tarefa já existe no sistema
  function alreadyExists(text: string): boolean {
    return existingTasks.some(t => t.title.toLowerCase() === text.toLowerCase())
  }

  function toggleTask(id: string) {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, selected: !t.selected } : t))
  }

  function toggleAll() {
    const allSelected = tasks.every(t => t.selected)
    onTasksChange(tasks.map(t => ({ ...t, selected: !allSelected })))
  }

  function editTask(id: string, text: string) {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, text } : t))
  }

  async function handleAddTasks() {
    const toAdd = tasks.filter(t => t.selected && !added.has(t.id))
    if (!toAdd.length) return
    setAdding(true)
    let addedCount = 0
    for (const task of toAdd) {
      const created = await addTask({
        title: task.text,
        description: `Extraída da nota: "${noteTitle}"`,
        status: "todo",
        priority: selectedPriority,
        projectId: selectedProject,
        dueDate: null,
        tags: [],
        recurring: null,
        position: 0,
        assignee: null,
      })
      if (!created) continue
      addedCount++
      setAdded(prev => new Set([...prev, task.id]))
    }
    setAdding(false)
    if (addedCount > 0) {
      toast.success(`${addedCount} tarefa${addedCount > 1 ? "s" : ""} adicionada${addedCount > 1 ? "s" : ""}!`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">Extrair tarefas</SheetTitle>

        {/* Header */}
        <div className="px-5 py-4 border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-7 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-semibold text-sm">Tarefas identificadas</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {tasks.length} item{tasks.length !== 1 ? "s" : ""} encontrado{tasks.length !== 1 ? "s" : ""} na nota
          </p>
        </div>

        {/* Config bar */}
        <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs text-muted-foreground">Adicionar em:</span>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-7 text-xs flex-1 min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPriority} onValueChange={v => setSelectedPriority(v as Priority)}>
            <SelectTrigger className="h-7 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][])
                .filter(([k]) => k !== "none")
                .map(([k, v]) => (
                  <SelectItem key={k} value={k} className={cn("text-xs", v.color)}>
                    {v.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select all */}
        <div className="px-4 py-2 border-b flex items-center justify-between shrink-0">
          <button
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ListChecks className="size-3.5" />
            {tasks.every(t => t.selected) ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          <span className="text-xs text-muted-foreground">
            {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto divide-y">
          {tasks.map(task => {
            const exists = alreadyExists(task.text)
            const wasAdded = added.has(task.id)
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  wasAdded
                    ? "bg-green-50 dark:bg-green-950/20"
                    : task.selected
                      ? "bg-background"
                      : "bg-muted/20"
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => !wasAdded && toggleTask(task.id)}
                  disabled={wasAdded}
                  className={cn(
                    "mt-0.5 size-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                    wasAdded
                      ? "bg-green-500 border-green-500"
                      : task.selected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {(wasAdded || task.selected) && (
                    <Check className="size-3 text-white" strokeWidth={3} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {wasAdded ? (
                    <p className="text-sm text-green-700 dark:text-green-400 line-through">
                      {task.text}
                    </p>
                  ) : (
                    <input
                      className="text-sm bg-transparent outline-none w-full"
                      value={task.text}
                      onChange={e => editTask(task.id, e.target.value)}
                    />
                  )}
                  {exists && !wasAdded && (
                    <span className="text-[10px] text-yellow-600 dark:text-yellow-400">
                      ⚠ Tarefa similar já existe
                    </span>
                  )}
                  {wasAdded && (
                    <span className="text-[10px] text-green-600 dark:text-green-400">
                      ✓ Adicionada ao sistema
                    </span>
                  )}
                </div>

                {/* Remove */}
                {!wasAdded && (
                  <button
                    onClick={() => onTasksChange(tasks.filter(t => t.id !== task.id))}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors mt-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-background shrink-0">
          <Button
            className="w-full gap-2"
            disabled={selectedCount === 0 || adding}
            onClick={handleAddTasks}
          >
            <Plus className="size-4" />
            {adding ? "Adicionando..." : `Adicionar ${selectedCount} tarefa${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
