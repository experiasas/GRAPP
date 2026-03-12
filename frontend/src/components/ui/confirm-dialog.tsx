import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Diálogo de confirmación inline (sin portal modal).
 * Reemplaza window.confirm() con un componente React reutilizable.
 *
 * Uso:
 *   const [confirmOpen, setConfirmOpen] = useState(false);
 *   const [pendingId, setPendingId] = useState<number | null>(null);
 *
 *   <ConfirmDialog
 *       open={confirmOpen}
 *       description="¿Está seguro de eliminar este elemento?"
 *       onConfirm={() => { handleDelete(pendingId!); setConfirmOpen(false); }}
 *       onCancel={() => setConfirmOpen(false)}
 *   />
 */
export function ConfirmDialog({
    open,
    title = 'Confirmar accion',
    description,
    confirmLabel = 'Eliminar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    return (
        // Overlay semitransparente que bloquea la interacción con el fondo
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-background border rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
