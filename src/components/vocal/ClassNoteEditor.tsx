import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ClassNote } from "@/types/vocal"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  note: ClassNote
  onUpdate: (patch: Partial<Omit<ClassNote, "id" | "createdAt">>) => void
  onDelete: () => void
}

export function ClassNoteEditor({ note, onUpdate, onDelete }: Props) {
  const [content, setContent] = useState(note.content)
  const [exercises, setExercises] = useState(note.exercises)
  const [songs, setSongs] = useState(note.songs)

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={note.weekDate}
            onChange={e => onUpdate({ weekDate: e.target.value })}
            className="text-sm font-medium bg-transparent outline-none"
          />
          <span className="text-xs text-muted-foreground">
            {format(parseISO(note.weekDate), "'semana de' dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">O que foi visto na aula</label>
        <Textarea
          rows={3}
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={() => { if (content !== note.content) onUpdate({ content }) }}
          className="text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Exercícios pra treinar</label>
          <Textarea
            rows={3}
            value={exercises}
            onChange={e => setExercises(e.target.value)}
            onBlur={() => { if (exercises !== note.exercises) onUpdate({ exercises }) }}
            className="text-sm resize-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Músicas</label>
          <Textarea
            rows={3}
            value={songs}
            onChange={e => setSongs(e.target.value)}
            onBlur={() => { if (songs !== note.songs) onUpdate({ songs }) }}
            className="text-sm resize-none"
          />
        </div>
      </div>
    </div>
  )
}
