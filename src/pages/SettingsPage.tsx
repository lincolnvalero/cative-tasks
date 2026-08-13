import { useState, useEffect } from "react"
import { useApp } from "@/context/AppContext"
import { supabase } from "@/lib/supabase"
import { ProjectIcon } from "@/components/ProjectIcon"
import { MemberAvatar } from "@/components/MemberAvatar"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function SettingsPage() {
  const { projects, members } = useApp()
  const [accessByProject, setAccessByProject] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("lt_project_members").select("project_id, user_id").then(({ data }) => {
      const map: Record<string, string[]> = {}
      for (const row of data ?? []) {
        const pid = row.project_id as string
        if (!map[pid]) map[pid] = []
        map[pid].push(row.user_id as string)
      }
      setAccessByProject(map)
      setLoading(false)
    })
  }, [])

  async function toggle(projectId: string, userId: string) {
    const current = accessByProject[projectId] ?? []
    const has = current.includes(userId)
    if (has) {
      const { error } = await supabase.from("lt_project_members").delete().eq("project_id", projectId).eq("user_id", userId)
      if (error) { toast.error("Erro ao revogar acesso"); return }
      setAccessByProject(prev => ({ ...prev, [projectId]: current.filter(id => id !== userId) }))
    } else {
      const { error } = await supabase.from("lt_project_members").insert({ project_id: projectId, user_id: userId })
      if (error) { toast.error("Erro ao conceder acesso"); return }
      setAccessByProject(prev => ({ ...prev, [projectId]: [...current, userId] }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Quem tem acesso a cada projeto</p>
      </div>

      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map(project => {
            const access = accessByProject[project.id] ?? []
            return (
              <div key={project.id} className="rounded-xl border p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ProjectIcon iconKey={project.emoji} className="size-4 shrink-0" style={{ color: project.color }} />
                  <span className="font-semibold text-sm">{project.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const has = access.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(project.id, m.id)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs h-7 pl-1.5 pr-2.5 rounded-full border transition-colors",
                          has
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <MemberAvatar member={m} size="xs" />
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum projeto ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}
