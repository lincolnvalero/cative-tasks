import { useState } from "react"
import { useNotesStore } from "@/store/useNotesStore"
import { NoteEditor } from "@/components/NoteEditor"
import { NOTE_COLORS, NOTE_TEMPLATES } from "@/types/note"
import type { Note } from "@/types/note"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Plus, Search, Pin, Trash2, Grid3x3, List, PinOff, Tag, X } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { showConfirm } from "@/components/ConfirmDialog"
import { toast } from "sonner"

export function NotesPage() {
  const { notes, loading, allTags, createNote, updateNote, deleteNote, togglePin } = useNotesStore()
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [search, setSearch] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    const matchTag = !activeTag || n.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  const pinned = filtered.filter(n => n.pinned)
  const others = filtered.filter(n => !n.pinned)

  async function handleNew(template?: string) {
    const note = await createNote(template)
    if (note) setEditingNote(note)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await showConfirm({ title: "Excluir nota?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (!ok) return
    await deleteNote(id)
    toast.success("Nota excluída")
  }

  async function handleTogglePin(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await togglePin(id)
  }

  const currentNote = editingNote ? notes.find(n => n.id === editingNote.id) ?? editingNote : null

  function NoteCard({ note }: { note: Note }) {
    const colorCfg = NOTE_COLORS[note.color] || NOTE_COLORS.default
    const preview = note.content
      .replace(/^#+\s/gm, "")
      .replace(/\*\*/g, "")
      .replace(/- \[[ x]\] /g, "")
      .split("\n").filter(Boolean).slice(0, 6).join("\n")

    return (
      <div
        className={cn(
          "group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
          colorCfg.bg, colorCfg.border,
          viewMode === "list" && "flex items-start gap-3"
        )}
        onClick={() => setEditingNote(note)}
      >
        {note.pinned && (
          <Pin className="absolute top-3 right-3 size-3 text-primary opacity-60" />
        )}

        {note.title && (
          <h3 className={cn("font-semibold text-sm mb-1 pr-5 leading-snug", viewMode === "list" && "mb-0 min-w-[200px] shrink-0")}>
            {note.title}
          </h3>
        )}

        {preview && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 whitespace-pre-line flex-1">
            {preview}
          </p>
        )}

        {!note.title && !note.content && (
          <p className="text-xs text-muted-foreground italic">Nota vazia</p>
        )}

        {/* Tags do card */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {note.tags.map(tag => (
              <span key={tag} onClick={e => { e.stopPropagation(); setActiveTag(activeTag === tag ? null : tag) }} className={cn("text-[10px] px-1.5 py-0.5 rounded-full border cursor-pointer transition-colors", activeTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-primary/5 text-primary/70 border-primary/20 hover:bg-primary/10")}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className={cn("flex items-center justify-between mt-2 pt-1", viewMode === "list" && "mt-0 pt-0 shrink-0 ml-auto")}>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true, locale: ptBR })}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => handleTogglePin(note.id, e)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={note.pinned ? "Desafixar" : "Fixar"}
            >
              {note.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            </button>
            <button
              onClick={e => handleDelete(note.id, e)}
              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Excluir"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5 pb-20 md:pb-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Notas</h1>
            <p className="text-sm text-muted-foreground">{notes.length} nota{notes.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => handleNew()} className="gap-1.5 shrink-0">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova nota</span>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Buscar notas..." className="pl-8 h-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")} title="Alternar visualização">
              {viewMode === "grid" ? <List className="size-4" /> : <Grid3x3 className="size-4" />}
            </Button>
          </div>

          {/* Filtros por tag */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Tag className="size-3 text-muted-foreground shrink-0" />
              {activeTag && (
                <button onClick={() => setActiveTag(null)} className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                  #{activeTag} <X className="size-3" />
                </button>
              )}
              {allTags.filter(t => t !== activeTag).map(tag => (
                <button key={tag} onClick={() => setActiveTag(tag)} className="text-xs px-2 py-0.5 rounded-full border border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="text-center">
              <p className="text-4xl mb-2">📝</p>
              <p className="font-semibold">Nenhuma nota ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Comece com um template ou crie uma nota em branco</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg">
              {NOTE_TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => handleNew(t.content)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all text-center"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && notes.length > 0 && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhuma nota encontrada para "{search}"</p>
        )}

        {pinned.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Pin className="size-3" /> Fixadas
            </p>
            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                : "flex flex-col gap-2"
            )}>
              {pinned.map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            {pinned.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outras</p>
            )}
            <div className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                : "flex flex-col gap-2"
            )}>
              {others.map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          </div>
        )}

        {!loading && notes.length > 0 && !search && (
          <div className="flex gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground self-center">Templates rápidos:</p>
            {NOTE_TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => handleNew(t.content)}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted/50 transition-colors flex items-center gap-1.5"
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <NoteEditor
        note={currentNote}
        allTags={allTags}
        onClose={() => setEditingNote(null)}
        onUpdate={updateNote}
        onDelete={deleteNote}
        onTogglePin={togglePin}
      />
    </>
  )
}
