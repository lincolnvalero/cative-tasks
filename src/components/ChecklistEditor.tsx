import { useRef, useState } from "react"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/types/task"

interface ChecklistEditorProps {
  items: ChecklistItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
  onReorder: (orderedIds: string[]) => void
  variant?: "compact" | "default"
}

function ChecklistRow({ item, onToggle, onDelete, onEdit, variant }: {
  item: ChecklistItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
  variant: "compact" | "default"
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.text)
  const inputRef = useRef<HTMLInputElement>(null)
  const compact = variant === "compact"

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setValue(item.text)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  function save() {
    if (value.trim() && value !== item.text) onEdit(item.id, value)
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-1.5 group/item", isDragging && "opacity-50")}>
      <button
        {...attributes} {...listeners}
        onClick={e => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0 touch-none"
      >
        <GripVertical className={compact ? "size-2.5" : "size-3.5"} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onToggle(item.id) }}
        className={cn(
          "rounded border flex items-center justify-center shrink-0 transition-colors",
          compact ? "size-3" : "size-4",
          item.done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {item.done && <Check className={compact ? "size-2" : "size-2.5"} />}
      </button>
      {editing ? (
        <input
          ref={inputRef}
          className={cn("bg-transparent outline-none border-b border-primary flex-1 min-w-0", compact ? "text-xs italic" : "text-sm")}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") { setValue(item.text); setEditing(false) }
          }}
        />
      ) : (
        <span
          onClick={startEdit}
          title={item.text}
          className={cn(
            "flex-1 min-w-0 cursor-text truncate",
            compact ? "text-xs italic text-gray-500 dark:text-gray-400" : "text-sm",
            item.done && "line-through opacity-60"
          )}
        >
          {item.text}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete(item.id) }}
        className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
      >
        <X className={compact ? "size-3" : "size-3.5"} />
      </button>
    </div>
  )
}

export function ChecklistEditor({ items, onToggle, onDelete, onEdit, onReorder, variant = "default" }: ChecklistEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex).map(i => i.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className={cn("flex flex-col", variant === "compact" ? "gap-0.5" : "gap-1.5")}>
          {items.map(item => (
            <ChecklistRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} variant={variant} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
