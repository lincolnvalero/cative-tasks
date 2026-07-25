import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { StarRating } from "@/components/vocal/StarRating"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { VocalSkill } from "@/types/vocal"

interface Props {
  skill: VocalSkill
  onMasteryChange: (v: number) => void
  onNotesChange: (v: string) => void
}

export function SkillRow({ skill, onMasteryChange, onNotesChange }: Props) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(skill.notes)

  return (
    <div className="border-b last:border-0">
      <div className="flex items-center gap-2 py-2">
        <button onClick={() => setOpen(v => !v)} className="text-muted-foreground/50 hover:text-foreground shrink-0">
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <span className="text-sm flex-1 min-w-0 truncate">{skill.name}</span>
        <StarRating value={skill.mastery} onChange={onMasteryChange} size="sm" />
      </div>
      {open && (
        <div className="pb-3 pl-6">
          <Textarea
            placeholder="Notas sobre essa técnica…"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => { if (notes !== skill.notes) onNotesChange(notes) }}
            className="text-xs resize-none"
          />
        </div>
      )}
    </div>
  )
}
