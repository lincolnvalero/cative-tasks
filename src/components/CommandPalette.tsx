import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command"
import { useApp } from "@/context/AppContext"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types/task"
import type { Task } from "@/types/task"
import { Flag, LayoutDashboard, CheckSquare, FolderKanban, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  onNavigate: (page: "dashboard" | "tasks" | "projects") => void
  onOpenTask: (task: Task) => void
  onNewTask: () => void
}

export function CommandPalette({ onNavigate, onOpenTask, onNewTask }: Props) {
  const { tasks, projects } = useApp()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function go(page: "dashboard" | "tasks" | "projects") {
    onNavigate(page)
    setOpen(false)
  }

  function openTask(task: Task) {
    onNavigate("tasks")
    onOpenTask(task)
    setOpen(false)
  }

  function newTask() {
    onNewTask()
    setOpen(false)
  }

  const activeTasks = tasks.filter(t => t.status !== "done")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">Busca de comandos</DialogTitle>
        <Command className="rounded-lg">
          <CommandInput placeholder="Buscar tarefas, projetos, ações..." autoFocus />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            <CommandGroup heading="Ações rápidas">
              <CommandItem onSelect={newTask} className="gap-2 cursor-pointer">
                <Plus className="size-4 text-muted-foreground" />
                <span>Nova tarefa</span>
                <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">N</kbd>
              </CommandItem>
              <CommandItem onSelect={() => go("dashboard")} className="gap-2 cursor-pointer">
                <LayoutDashboard className="size-4 text-muted-foreground" />
                <span>Ir para Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => go("tasks")} className="gap-2 cursor-pointer">
                <CheckSquare className="size-4 text-muted-foreground" />
                <span>Ir para Tarefas</span>
              </CommandItem>
              <CommandItem onSelect={() => go("projects")} className="gap-2 cursor-pointer">
                <FolderKanban className="size-4 text-muted-foreground" />
                <span>Ir para Projetos</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Tarefas ativas">
              {activeTasks.map(task => {
                const status = STATUS_CONFIG[task.status]
                const priority = PRIORITY_CONFIG[task.priority]
                const project = projects.find(p => p.id === task.projectId)
                return (
                  <CommandItem
                    key={task.id}
                    value={`${task.title} ${project?.name ?? ""}`}
                    onSelect={() => openTask(task)}
                    className="gap-2 cursor-pointer"
                  >
                    <span className={cn("size-2 rounded-full shrink-0", status.bg, "border", status.color.replace("text-", "border-"))} />
                    <span className="flex-1 truncate">{task.title}</span>
                    {task.priority !== "none" && (
                      <Flag className={cn("size-3 shrink-0", priority.color)} />
                    )}
                    {project && (
                      <span className="text-xs text-muted-foreground shrink-0">{project.name}</span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
