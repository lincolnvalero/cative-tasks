import { LayoutDashboard, CheckSquare, FolderKanban, Search, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"

type Page = "dashboard" | "tasks" | "projects" | "notes" | "collaborators"

interface Props {
  page: Page
  onNavigate: (p: Page) => void
  onSearch: () => void
}

const ITEMS = [
  { id: "dashboard" as Page, label: "Dashboard", Icon: LayoutDashboard },
  { id: "tasks" as Page,     label: "Tarefas",   Icon: CheckSquare },
  { id: "projects" as Page,  label: "Projetos",  Icon: FolderKanban },
  { id: "notes" as Page,     label: "Notas",     Icon: StickyNote },
]

export function BottomNav({ page, onNavigate, onSearch }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background/95 backdrop-blur">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
            page === id ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Icon className={cn("size-5", page === id && "stroke-[2.5]")} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
      <button
        onClick={onSearch}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors"
      >
        <Search className="size-5" />
        <span className="text-[10px] font-medium">Buscar</span>
      </button>
    </nav>
  )
}
