import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useVocalStore } from "@/store/useVocalStore"
import { VideoCard } from "@/components/vocal/VideoCard"
import { VideoDialog } from "@/components/vocal/VideoDialog"
import { ReferenceRow } from "@/components/vocal/ReferenceRow"
import { ClassNoteEditor } from "@/components/vocal/ClassNoteEditor"
import { SkillRow } from "@/components/vocal/SkillRow"
import { VOCAL_SKILL_CATEGORY_CONFIG } from "@/types/vocal"
import type { VocalVideo, VocalSkillCategory } from "@/types/vocal"
import { Plus, Search, X } from "lucide-react"
import { showConfirm } from "@/components/ConfirmDialog"
import { format } from "date-fns"

export function SingingPage() {
  const {
    videos, references, classNotes, skills, profile, loading,
    addVideo, updateVideo, deleteVideo,
    addReference, updateReference, deleteReference,
    addClassNote, updateClassNote, deleteClassNote,
    updateSkillMastery, updateSkillNotes,
    updateVocalRange,
  } = useVocalStore()

  const [tab, setTab] = useState<"videos" | "references" | "classes" | "profile">("videos")
  const [search, setSearch] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VocalVideo | null>(null)
  const [vocalRangeDraft, setVocalRangeDraft] = useState("")

  const allTags = useMemo(() => Array.from(new Set(videos.flatMap(v => v.tags))).sort(), [videos])

  const filteredVideos = videos.filter(v => {
    const matchSearch = !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.artist.toLowerCase().includes(search.toLowerCase()) ||
      v.style.toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || v.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  function openNewVideo() { setEditingVideo(null); setVideoDialogOpen(true) }
  function openEditVideo(v: VocalVideo) { setEditingVideo(v); setVideoDialogOpen(true) }

  function handleSaveVideo(data: Omit<VocalVideo, "id" | "createdAt">) {
    if (editingVideo) updateVideo(editingVideo.id, data)
    else addVideo(data)
  }

  async function handleDeleteVideo(id: string, title: string) {
    const ok = await showConfirm({ title: `Excluir "${title}"?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (ok) deleteVideo(id)
  }

  async function handleDeleteReference(id: string, technique: string) {
    const ok = await showConfirm({ title: `Excluir referência "${technique}"?`, description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (ok) deleteReference(id)
  }

  async function handleDeleteClassNote(id: string) {
    const ok = await showConfirm({ title: "Excluir nota de aula?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (ok) deleteClassNote(id)
  }

  function saveVocalRange() {
    if (vocalRangeDraft !== (profile?.vocalRange ?? "")) updateVocalRange(vocalRangeDraft)
  }

  const skillsByCategory = (cat: VocalSkillCategory) => skills.filter(s => s.category === cat)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl sm:text-2xl font-bold">Canto</h1>

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="videos">Vídeos</TabsTrigger>
          <TabsTrigger value="references">Referências</TabsTrigger>
          <TabsTrigger value="classes">Aulas</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
        </TabsList>

        {/* ── Vídeos ────────────────────────────────────────────────────── */}
        <TabsContent value="videos" className="flex flex-col gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Buscar por título, cantor, estilo..." className="pl-8 h-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={openNewVideo}>
              <Plus className="size-3.5" /> Novo vídeo
            </Button>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? "default" : "secondary"}
                  className="cursor-pointer text-xs"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
              {activeTag && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground" onClick={() => setActiveTag(null)}>
                  <X className="size-3" /> Limpar
                </Button>
              )}
            </div>
          )}

          {filteredVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum vídeo ainda. Clique em "Novo vídeo" pra começar.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onOpen={() => openEditVideo(video)}
                  onDelete={() => handleDeleteVideo(video.id, video.title)}
                  onMasteryChange={v => updateVideo(video.id, { mastery: v })}
                />
              ))}
            </div>
          )}

          <VideoDialog open={videoDialogOpen} video={editingVideo} onClose={() => setVideoDialogOpen(false)} onSave={handleSaveVideo} />
        </TabsContent>

        {/* ── Referências ───────────────────────────────────────────────── */}
        <TabsContent value="references" className="flex flex-col gap-3 mt-4">
          <p className="text-xs text-muted-foreground">Referências mundiais das técnicas que você quer dominar — clique em qualquer campo pra editar.</p>
          <div className="rounded-xl border px-1">
            {references.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma referência ainda.</p>
            )}
            {references.map(ref => (
              <ReferenceRow
                key={ref.id}
                reference={ref}
                onUpdate={patch => updateReference(ref.id, patch)}
                onDelete={() => handleDeleteReference(ref.id, ref.technique)}
              />
            ))}
          </div>
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 self-start"
            onClick={() => addReference({ technique: "Nova técnica", artist: "", url: "", notes: "" })}
          >
            <Plus className="size-3.5" /> Adicionar referência
          </Button>
        </TabsContent>

        {/* ── Aulas ─────────────────────────────────────────────────────── */}
        <TabsContent value="classes" className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5 self-start"
            onClick={() => addClassNote({ weekDate: format(new Date(), "yyyy-MM-dd"), content: "", exercises: "", songs: "" })}
          >
            <Plus className="size-3.5" /> Nova semana
          </Button>
          {classNotes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma anotação de aula ainda.</p>
          )}
          {classNotes.map(note => (
            <ClassNoteEditor
              key={note.id}
              note={note}
              onUpdate={patch => updateClassNote(note.id, patch)}
              onDelete={() => handleDeleteClassNote(note.id)}
            />
          ))}
        </TabsContent>

        {/* ── Perfil ────────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="flex flex-col gap-5 mt-4">
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground">Extensão vocal</label>
            <Input
              placeholder="ex: C3–G5"
              defaultValue={profile?.vocalRange ?? ""}
              onChange={e => setVocalRangeDraft(e.target.value)}
              onBlur={saveVocalRange}
            />
          </div>

          {(["registro", "ornamento", "efeito"] as VocalSkillCategory[]).map(cat => (
            <div key={cat} className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">{VOCAL_SKILL_CATEGORY_CONFIG[cat].label}</h2>
              <div className="rounded-xl border px-3">
                {skillsByCategory(cat).map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    onMasteryChange={v => updateSkillMastery(skill.id, v)}
                    onNotesChange={v => updateSkillNotes(skill.id, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
