import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number // 0-5
  onChange: (v: number) => void
  size?: "sm" | "md"
}

export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const starClass = size === "sm" ? "size-3.5" : "size-5"
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          title={`${n}/5`}
          className="text-muted-foreground/30 hover:text-yellow-400 transition-colors"
        >
          <Star className={cn(starClass, n <= value && "fill-yellow-400 text-yellow-400")} />
        </button>
      ))}
    </div>
  )
}
