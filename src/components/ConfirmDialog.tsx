import { useState, useCallback } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={v => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : undefined}>
            Confirmar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface UseConfirmReturn {
  confirm: (opts: ConfirmDialogProps & { onConfirm: () => void; onCancel?: () => void }) => void
  ConfirmDialogComponent: React.FC
}

export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<Omit<ConfirmDialogProps, "onCancel"> & { onConfirm: () => void } | null>(null)

  const confirm = useCallback((opts: ConfirmDialogProps & { onConfirm: () => void; onCancel?: () => void }) => {
    setState({
      open: true,
      title: opts.title,
      description: opts.description,
      onConfirm: () => {
        opts.onConfirm()
        setState(null)
      },
      variant: opts.variant,
    })
  }, [])

  const ConfirmDialogComponent = () => {
    if (!state) return null
    return (
      <ConfirmDialog
        open={true}
        title={state.title}
        description={state.description}
        onConfirm={state.onConfirm}
        onCancel={() => setState(null)}
        variant={state.variant}
      />
    )
  }

  return { confirm, ConfirmDialogComponent }
}
