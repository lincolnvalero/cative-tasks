import { Camera, Clapperboard, Music2, Trash2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/vocal/StarRating"
import type { VocalVideo } from "@/types/vocal"
import { cn } from "@/lib/utils"

const PLATFORM_ICON = { instagram: Camera, tiktok: Music2, youtube: Clapperboard }

interface Props {
  video: VocalVideo
  onOpen: () => void
  onDelete: () => void
  onMasteryChange: (v: number) => void
}

export function VideoCard({ video, onOpen, onDelete, onMasteryChange }: Props) {
  const PlatformIcon = PLATFORM_ICON[video.platform]

  return (
    <div className="group relative rounded-xl border overflow-hidden hover:border-primary/40 transition-colors cursor-pointer" onClick={onOpen}>
      <div className={cn("aspect-video bg-muted flex items-center justify-center overflow-hidden", !video.coverUrl && "bg-gradient-to-br from-muted to-muted-foreground/10")}>
        {video.coverUrl ? (
          <img src={video.coverUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <PlatformIcon className="size-8 text-muted-foreground/40" />
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{video.title}</p>
          <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-muted-foreground hover:text-primary">
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        {(video.artist || video.style) && (
          <p className="text-xs text-muted-foreground truncate">
            {[video.artist, video.style].filter(Boolean).join(" · ")}
          </p>
        )}

        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <StarRating value={video.mastery} onChange={onMasteryChange} size="sm" />
          <Button
            variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
            onClick={e => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
