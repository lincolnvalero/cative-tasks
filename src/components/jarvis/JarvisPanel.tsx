import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Mic, Square, Volume2, VolumeX, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useApp } from "@/context/AppContext"
import type { JarvisMessage } from "@/types/jarvis"

interface Props {
  open: boolean
  onClose: () => void
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function JarvisPanel({ open, onClose }: Props) {
  const { projects } = useApp()
  const [messages, setMessages] = useState<JarvisMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  function speak(text: string) {
    if (!speakReplies || !("speechSynthesis" in window)) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "pt-BR"
    window.speechSynthesis.speak(utterance)
  }

  async function send(payload: { text?: string; audioBase64?: string; audioMimeType?: string }, displayText: string) {
    const history = [...messages, { role: "user" as const, text: displayText }]
    setMessages(history)
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: {
          messages: history,
          audioBase64: payload.audioBase64,
          audioMimeType: payload.audioMimeType,
          projects: projects.map(p => ({ id: p.id, name: p.name })),
        },
      })
      if (error) {
        toast.error("Erro ao falar com o Jarvis — confirme se a GEMINI_API_KEY está configurada no Supabase")
        return
      }
      const reply = data?.message ?? "Não consegui responder."
      setMessages(h => [...h, { role: "model", text: reply }])
      speak(reply)
      if (data?.taskCreated) toast.success("Tarefa criada!")
    } finally {
      setSending(false)
    }
  }

  async function handleSendText() {
    const text = draft.trim()
    if (!text) return
    setDraft("")
    await send({ text }, text)
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const audioBase64 = await blobToBase64(blob)
        await send({ audioBase64, audioMimeType: recorder.mimeType }, "🎤 (mensagem por áudio)")
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      toast.error("Não consegui acessar o microfone")
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg flex flex-col h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Bot className="size-4" /> Jarvis
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 py-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Fale ou digite — peça pra criar uma tarefa, ou pergunte o que você tem pendente.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="size-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t items-end">
          <Button
            variant={speakReplies ? "default" : "outline"}
            size="icon"
            className="shrink-0"
            title={speakReplies ? "Respostas por voz: ligado" : "Respostas por voz: desligado"}
            onClick={() => setSpeakReplies(v => !v)}
          >
            {speakReplies ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <Button
            variant={recording ? "destructive" : "outline"}
            size="icon"
            className="shrink-0"
            onClick={toggleRecording}
            title={recording ? "Parar gravação" : "Gravar áudio"}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Textarea
            placeholder="Escreva ou grave um áudio…"
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
            className="resize-none text-sm min-h-9"
          />
          <Button size="icon" className="shrink-0" onClick={handleSendText} disabled={!draft.trim() || sending}>
            <Send className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
