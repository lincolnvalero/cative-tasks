import { useApp } from "@/context/AppContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { MemberAvatar } from "@/components/MemberAvatar"
import { Bell, Check, X, FolderKanban } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export function NotificationBell() {
  const { notifications, members, projects, acceptInvite, dismissNotification } = useApp()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 relative" title="Notificações">
          <Bell className="size-4" />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center text-[9px] rounded-full"
            >
              {notifications.length > 9 ? "9+" : notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notificação pendente</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
            {notifications.map(n => {
              const actor = members.find(m => m.id === n.actorId)
              const project = projects.find(p => p.id === n.projectId)
              return (
                <div key={n.id} className="flex flex-col gap-2 p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-start gap-2">
                    {actor ? <MemberAvatar member={actor} size="sm" /> : <FolderKanban className="size-6 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-semibold">{actor?.name ?? "Alguém"}</span> convidou você pra o projeto{" "}
                        <span className="font-semibold">{project?.name ?? "desconhecido"}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => dismissNotification(n.id)}>
                      <X className="size-3" /> Recusar
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => acceptInvite(n)}>
                      <Check className="size-3" /> Aceitar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
