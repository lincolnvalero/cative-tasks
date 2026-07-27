import { useState } from "react"
import { Camera, Clapperboard, Music2, ExternalLink, Trash2, MessageCircle, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProjectIcon } from "@/components/ProjectIcon"
import type { InboxItem } from "@/types/inbox"
import type { Project } from "@/types/task"
import { cn } from "@/lib/utils"

const PLATFORM_ICON = { instagram: Camera, tiktok: Music2, youtube: Clapperboard }

interface Props {
  item: InboxItem
  projects: Project[]
  onPromote: (projectId: string) => void
  onDismiss: () => void
  onDelete: () => void
  onDiscuss: () => void
}

export function InboxCard({ item, projects, onPromote, onDismiss, onDelete, onDiscuss }: Props) {
  const PlatformIcon = PLATFORM_ICON[item.platform]
  const [projectId, setProjectId] = useState(item.suggestedProjectId ?? projects[0]?.id ?? "")
  const suggestedProject = projects.find(p => p.id === item.suggestedProjectId)

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", item.status === "dismissed" && "opacity-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon className="size-4 text-muted-foreground shrink-0" />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline truncate flex items-center gap-1">
            {item.url} <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
        {suggestedProject && (
          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
            <ProjectIcon iconKey={suggestedProject.emoji} className="size-3" style={{ color: suggestedProject.color }} />
            sugestão: {suggestedProject.name}
          </Badge>
        )}
      </div>

      <p className="text-sm">{item.caption || <span className="text-muted-foreground italic">Sem legenda</span>}</p>

      {item.transcript && (
        <p className="text-xs text-muted-foreground line-clamp-3 border-l-2 pl-2">{item.transcript}</p>
      )}

      {item.status !== "dismissed" && item.status !== "promoted" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Projeto…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <ProjectIcon iconKey={p.emoji} className="size-3.5" style={{ color: p.color }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => onPromote(projectId)} disabled={!projectId}>
            <Check className="size-3.5" /> Criar tarefa
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onDiscuss}>
            <MessageCircle className="size-3.5" /> Discutir com IA
          </Button>
          <Button size="sm" variant="ghost" className="h-8 ml-auto text-muted-foreground" onClick={onDismiss}>
            Dispensar
          </Button>
        </div>
      )}

      {item.status === "dismissed" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Dispensado</span>
          <Button size="sm" variant="ghost" className="h-7 text-destructive gap-1" onClick={onDelete}>
            <Trash2 className="size-3.5" /> Excluir
          </Button>
        </div>
      )}

      {item.status === "promoted" && (
        <Badge variant="outline" className="self-start text-[10px] gap-1 text-green-600 border-green-600/30">
          <Check className="size-3" /> Virou tarefa
        </Badge>
      )}
    </div>
  )
}
