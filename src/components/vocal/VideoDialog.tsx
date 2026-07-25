import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/vocal/StarRating"
import type { VocalVideo, VocalPlatform } from "@/types/vocal"
import { VOCAL_PLATFORM_CONFIG } from "@/types/vocal"
import { X } from "lucide-react"

interface Props {
  open: boolean
  video?: VocalVideo | null
  onClose: () => void
  onSave: (data: Omit<VocalVideo, "id" | "createdAt">) => void
}

const emptyForm = {
  title: "", artist: "", style: "", platform: "youtube" as VocalPlatform,
  url: "", coverUrl: "", tags: [] as string[], notes: "", mastery: 0,
}

export function VideoDialog({ open, video, onClose, onSave }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (video) {
      setForm({
        title: video.title, artist: video.artist, style: video.style, platform: video.platform,
        url: video.url, coverUrl: video.coverUrl, tags: video.tags, notes: video.notes, mastery: video.mastery,
      })
    } else {
      setForm(emptyForm)
    }
    setTagInput("")
  }, [video, open])

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    setTagInput("")
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  function handleSave() {
    if (!form.title.trim() || !form.url.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{video ? "Editar vídeo" : "Novo vídeo"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            placeholder="Título *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Cantor" value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} />
            <Input placeholder="Estilo" value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Plataforma</label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as VocalPlatform }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(VOCAL_PLATFORM_CONFIG) as [VocalPlatform, { label: string }][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Domínio</label>
              <div className="h-9 flex items-center">
                <StarRating value={form.mastery} onChange={v => setForm(f => ({ ...f, mastery: v }))} />
              </div>
            </div>
          </div>

          <Input placeholder="Link do vídeo *" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          <Input placeholder="Link da capa (cover) — opcional" value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Tags de técnica</label>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag e pressionar Enter..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                className="flex-1"
              />
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="size-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Textarea
            placeholder="Anotações — como fazer, dicas que peguei..."
            rows={4}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || !form.url.trim()}>
            {video ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
