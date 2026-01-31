import { useRef, useState } from 'react';
import { Anexo, TipoAnexo } from '@/api/wizardApi';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnexosPanelProps {
    anexos: Anexo[];
    tipos: TipoAnexo[];
    onUpload: (tipoId: number, file: File) => Promise<void>;
    onDelete: (anexoId: number) => Promise<void>;
    readOnly?: boolean;
}

export const AnexosPanel = ({ anexos, tipos, onUpload, onDelete, readOnly }: AnexosPanelProps) => {
    const obligatorios = tipos.filter(t => t.obligatorio);
    const opcionales = tipos.filter(t => !t.obligatorio);

    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-red-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-slate-800">Documentos Obligatorios</h3>
                </div>
                <div className="grid gap-4">
                    {obligatorios.map(tipo => (
                        <AnexoRow
                            key={tipo.id}
                            tipo={tipo}
                            anexo={anexos.find(a => a.tipo.id === tipo.id)}
                            onUpload={onUpload}
                            onDelete={onDelete}
                            readOnly={readOnly}
                        />
                    ))}
                    {obligatorios.length === 0 && <p className="text-muted-foreground text-sm">No hay documentos obligatorios.</p>}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-lg font-semibold text-slate-800">Documentos Opcionales</h3>
                </div>
                <div className="grid gap-4">
                    {opcionales.map(tipo => (
                        <AnexoRow
                            key={tipo.id}
                            tipo={tipo}
                            anexo={anexos.find(a => a.tipo.id === tipo.id)}
                            onUpload={onUpload}
                            onDelete={onDelete}
                            readOnly={readOnly}
                        />
                    ))}
                    {opcionales.length === 0 && <p className="text-muted-foreground text-sm">No hay documentos opcionales.</p>}
                </div>
            </section>
        </div>
    );
};

const AnexoRow = ({
    tipo,
    anexo,
    onUpload,
    onDelete,
    readOnly
}: {
    tipo: TipoAnexo;
    anexo?: Anexo;
    onUpload: (id: number, f: File) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    readOnly?: boolean;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            await onUpload(tipo.id, file);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!anexo) return;
        setLoading(true);
        try {
            await onDelete(anexo.id);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn(
            "p-4 rounded-xl border flex items-center justify-between transition-all",
            anexo
                ? "bg-green-50/50 border-green-200"
                : "bg-white border-slate-200 hover:border-slate-300"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    anexo ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                )}>
                    {anexo ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className={cn("font-medium", anexo ? "text-green-900" : "text-slate-700")}>
                        {tipo.nombre}
                    </h4>
                    {anexo ? (
                        <a
                            href={anexo.archivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline flex items-center gap-1"
                        >
                            Ver archivo cargado
                        </a>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {tipo.descripcion || "Formato PDF o Imagen max 5MB"}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {anexo ? (
                    !readOnly && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            disabled={loading}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )
                ) : (
                    !readOnly && (
                        <>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.png,.jpg,.jpeg"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Subir
                            </Button>
                        </>
                    )
                )}
            </div>
        </div>
    );
};
