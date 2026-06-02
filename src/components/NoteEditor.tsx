import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Note, NoteColor } from "@/types/note"
import { NOTE_COLORS } from "@/types/note"
import { Pin, PinOff, Trash2, X } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { showConfirm } from "@/components/ConfirmDialog"
import { toast } from "sonner"

interface Props {
  note: Note | null
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Pick<Note, "title" | "content" | "color" | "pinned">>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTogglePin: (id: string) => Promise<void>
}

export function NoteEditor({ note, onClose, onUpdate, onDelete, onTogglePin }: Props) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTimeout(() => {
        if (!note.title) contentRef.current?.focus()
      }, 100)
    }
  }, [note?.id])

  function scheduleAutoSave(newTitle: string, newContent: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!note) return
      setSaving(true)
      await onUpdate(note.id, { title: newTitle, content: newContent })
      setSaving(false)
    }, 800)
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    scheduleAutoSave(v, content)
  }

  function handleContentChange(v: string) {
    setContent(v)
    scheduleAutoSave(title, v)
    if (contentRef.current) {
      contentRef.current.style.height = "auto"
      contentRef.current.style.height = contentRef.current.scrollHeight + "px"
    }
  }

  async function handleColorChange(color: NoteColor) {
    if (!note) return
    await onUpdate(note.id, { color })
  }

  async function handleDelete() {
    if (!note) return
    const ok = await showConfirm({ title: "Excluir esta nota?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir", variant: "destructive" })
    if (!ok) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await onDelete(note.id)
    toast.success("Nota excluída")
    onClose()
  }

  if (!note) return null
  const colorCfg = NOTE_COLORS[note.color] || NOTE_COLORS.default

  return (
    <Dialog open={!!note} onOpenChange={v => !v && onClose()}>
      <DialogContent className={cn("max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden", colorCfg.bg, colorCfg.border)}>
        <DialogTitle className="sr-only">Editar nota</DialogTitle>

        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <input
            className="text-xl font-bold bg-transparent outline-none flex-1 placeholder:text-muted-foreground/50"
            placeholder="Título..."
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && contentRef.current?.focus()}
          />
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {saving && <span className="text-[10px] text-muted-foreground animate-pulse">salvando...</span>}
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 px-5 overflow-y-auto">
          <textarea
            ref={contentRef}
            className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 min-h-[200px]"
            placeholder="Escreva aqui... use listas com - ou * e títulos com #"
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") onClose()
              if (e.key === "Enter") {
                const lines = content.slice(0, e.currentTarget.selectionStart).split("\n")
                const lastLine = lines[lines.length - 1]
                const listMatch = lastLine.match(/^(\s*[-*]\s)/)
                const checkMatch = lastLine.match(/^(\s*- \[[ x]\] )/)
                if (checkMatch && lastLine.trim() === "- [ ]") {
                  e.preventDefault()
                  const cursor = e.currentTarget.selectionStart
                  const newContent = content.slice(0, cursor - lastLine.length) + content.slice(cursor)
                  handleContentChange(newContent)
                } else if (listMatch) {
                  e.preventDefault()
                  const cursor = e.currentTarget.selectionStart
                  const insert = "\n" + listMatch[1]
                  handleContentChange(content.slice(0, cursor) + insert + content.slice(cursor))
                  setTimeout(() => {
                    if (contentRef.current) {
                      contentRef.current.selectionStart = contentRef.current.selectionEnd = cursor + insert.length
                    }
                  }, 0)
                }
              }
            }}
            style={{ minHeight: "200px" }}
          />
        </div>

        <div className={cn("flex items-center justify-between px-4 py-2 border-t shrink-0", colorCfg.border)}>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              {(Object.entries(NOTE_COLORS) as [NoteColor, typeof NOTE_COLORS[NoteColor]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleColorChange(key)}
                  className={cn(
                    "size-5 rounded-full border-2 transition-transform hover:scale-110",
                    cfg.bg.split(" ")[0],
                    note.color === key ? "border-primary scale-110" : "border-transparent"
                  )}
                  title={cfg.label}
                  style={key === "default" ? { background: "var(--card)" } : undefined}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {content.length} chars · editado {formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true, locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onTogglePin(note.id)} title={note.pinned ? "Desafixar" : "Fixar"}>
              {note.pinned ? <PinOff className="size-3.5 text-primary" /> : <Pin className="size-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
