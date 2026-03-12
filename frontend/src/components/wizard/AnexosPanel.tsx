import { useRef, useState } from 'react';
import { Anexo, TipoAnexo } from '@/api/wizardApi';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, FileText, CheckCircle2, ExternalLink, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnexosPanelProps {
    anexos: Anexo[];
    tipos: TipoAnexo[];
    onUpload: (tipoId: number, file: File) => Promise<void>;
    onDelete: (anexoId: number) => Promise<void>;
    readOnly?: boolean;
    requiereSeguridadSocial?: boolean;
}

export const AnexosPanel = ({
    anexos,
    tipos,
    onUpload,
    onDelete,
    readOnly,
    requiereSeguridadSocial,
}: AnexosPanelProps) => {
    // Los tipos ya vienen filtrados por tipo_persona desde el backend
    const obligatorios = tipos.filter(t => t.obligatorio);
    const opcionales = tipos.filter(t => !t.obligatorio);

    return (
        <div className="space-y-10">
            {/* Alerta de seguridad social */}
            {requiereSeguridadSocial && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">
                                Documentos adicionales requeridos
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                Debido a que su acumulado mensual supera el umbral, debe adjuntar la
                                Planilla de Seguridad Social y el Informe de Actividades de forma obligatoria.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Seccion Obligatorios */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Documentos Obligatorios</h3>
                        <p className="text-sm text-muted-foreground">Estos documentos son requeridos para la radicacion</p>
                    </div>
                </div>
                <div className="space-y-3">
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
                    {obligatorios.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay documentos obligatorios configurados.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Seccion Opcionales */}
            {opcionales.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Documentos Opcionales</h3>
                            <p className="text-sm text-muted-foreground">Soporte adicional para su radicacion</p>
                        </div>
                    </div>
                    <div className="space-y-3">
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
                    </div>
                </section>
            )}
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
            "document-row",
            anexo && "completed"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "document-icon",
                    anexo ? "completed" : "pending"
                )}>
                    {anexo ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <FileText className="w-5 h-5" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className={cn(
                        "font-medium truncate",
                        anexo ? "text-success" : "text-foreground"
                    )}>
                        {tipo.nombre}
                    </h4>
                    {anexo ? (
                        <a
                            href={`http://localhost:8000${anexo.archivo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Ver archivo cargado
                        </a>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Formato PDF o Imagen, max. 5MB
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                {anexo ? (
                    !readOnly && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            disabled={loading}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-3"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Eliminar
                                </>
                            )}
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
                                className="h-9 px-4 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Subir Archivo
                                    </>
                                )}
                            </Button>
                        </>
                    )
                )}
            </div>
        </div>
    );
};
