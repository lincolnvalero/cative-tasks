import { useState } from "react"
import { Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VocalReference } from "@/types/vocal"

interface Props {
  reference: VocalReference
  onUpdate: (patch: Partial<Omit<VocalReference, "id" | "createdAt">>) => void
  onDelete: () => void
}

function EditableField({ value, placeholder, onSave, className }: {
  value: string
  placeholder: string
  onSave: (v: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function save() {
    if (draft !== value) onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className={`bg-transparent outline-none border-b border-primary w-full ${className ?? ""}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(value); setEditing(false) } }}
      />
    )
  }
  return (
    <span
      className={`cursor-text truncate ${!value ? "text-muted-foreground/40" : ""} ${className ?? ""}`}
      onClick={() => { setDraft(value); setEditing(true) }}
    >
      {value || placeholder}
    </span>
  )
}

export function ReferenceRow({ reference, onUpdate, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 border-b py-2.5 px-1 group">
      <div className="flex-1 min-w-0">
        <EditableField value={reference.technique} placeholder="Técnica…" onSave={v => onUpdate({ technique: v })} className="text-sm font-medium" />
      </div>
      <div className="w-40 shrink-0 hidden sm:block">
        <EditableField value={reference.artist} placeholder="Cantor…" onSave={v => onUpdate({ artist: v })} className="text-xs text-muted-foreground" />
      </div>
      <div className="w-56 shrink-0 hidden md:block">
        <EditableField value={reference.notes} placeholder="Anotações…" onSave={v => onUpdate({ notes: v })} className="text-xs text-muted-foreground" />
      </div>
      <div className="w-32 shrink-0 hidden lg:block">
        <EditableField value={reference.url} placeholder="Link…" onSave={v => onUpdate({ url: v })} className="text-xs text-muted-foreground" />
      </div>
      {reference.url && (
        <a href={reference.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary">
          <ExternalLink className="size-3.5" />
        </a>
      )}
      <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
