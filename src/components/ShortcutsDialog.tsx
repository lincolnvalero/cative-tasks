import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const SHORTCUTS = [
  { category: "Navegação", items: [
    { key: "N", description: "Nova tarefa" },
    { key: "Ctrl+K", description: "Busca" },
    { key: "?", description: "Mostrar atalhos" },
  ] },
  { category: "Tarefas", items: [
    { key: "Ctrl+D", description: "Marcar como concluída" },
  ] },
  { category: "Sistema", items: [
    { key: "D", description: "Alternar tema" },
  ] },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map(group => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">{group.category}</h3>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{item.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold border rounded bg-muted">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
