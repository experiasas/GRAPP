import { useState } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentosRequeridos, DocumentoRequerido } from '@/components/forms/DocumentosRequeridos';
import { vinculacionAPI } from '@/lib/api';

interface DocumentosTabProps {
    terceroId: number;
    documentosRequeridos: DocumentoRequerido[];
    onComplete?: () => void;
}

export default function DocumentosTab({ terceroId, documentosRequeridos, onComplete }: DocumentosTabProps) {
    const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'success' | 'error'>>({});
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);

    const handleUpload = async () => {
        if (Object.keys(documentFiles).length === 0) {
            setError('Debe seleccionar al menos un documento para cargar');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess(false);

        try {
            await vinculacionAPI.uploadDocumentosParallel(
                terceroId,
                documentFiles,
                3, // Concurrencia: 3 archivos a la vez
                (code, status) => {
                    setUploadProgress(prev => ({ ...prev, [code]: status }));
                }
            );

            setSuccess(true);
            setDocumentFiles({});
            onComplete?.();
        } catch (err: any) {
            setError('Error al cargar algunos documentos. Por favor intente nuevamente.');
        } finally {
            setUploading(false);
        }
    };

    const obligatorios = documentosRequeridos.filter(d => d.obligatorio);
    const opcionales = documentosRequeridos.filter(d => !d.obligatorio);
    const obligatoriosPendientes = obligatorios.filter(
        doc => !documentFiles[doc.documento_tipo_code] && uploadProgress[doc.documento_tipo_code] !== 'success'
    );

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                    <FileText className="w-5 h-5" />
                    Documentos Requeridos
                </h2>
                <p className="text-sm text-muted-foreground">
                    Adjunte los documentos necesarios para completar su vinculación
                </p>
            </div>

            {/* Componente de selección de documentos */}
            <DocumentosRequeridos
                documentos={documentosRequeridos}
                onChange={setDocumentFiles}
                uploadStatus={Object.fromEntries(
                    Object.entries(uploadProgress).map(([code, status]) => [
                        code,
                        { status: status === 'uploading' ? 'uploading' : status === 'success' ? 'success' : 'error' }
                    ])
                )}
            />

            {/* Mensajes de estado */}
            {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-destructive">Error</p>
                        <p className="text-sm text-destructive/80">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-green-700 dark:text-green-400">Documentos Cargados</p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                            Sus documentos se han cargado exitosamente
                        </p>
                    </div>
                </div>
            )}

            {/* Resumen */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                        Documentos seleccionados: <strong>{Object.keys(documentFiles).length}</strong>
                    </span>
                    {obligatoriosPendientes.length > 0 && (
                        <span className="text-yellow-600">
                            {obligatoriosPendientes.length} obligatorio(s) pendiente(s)
                        </span>
                    )}
                </div>
            </div>

            {/* Botón de carga */}
            <div className="mt-6 flex justify-end gap-3">
                {Object.keys(documentFiles).length > 0 && !uploading && (
                    <Button
                        variant="outline"
                        onClick={() => setDocumentFiles({})}
                    >
                        Limpiar Selección
                    </Button>
                )}

                <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={uploading || Object.keys(documentFiles).length === 0}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cargando {Object.keys(uploadProgress).length} de {Object.keys(documentFiles).length}...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Cargar Documentos ({Object.keys(documentFiles).length})
                        </>
                    )}
                </Button>
            </div>

            {/* Información adicional */}
            <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                    💡 <strong>Nota:</strong> Puede cargar los documentos en múltiples sesiones.
                    Los documentos obligatorios deben estar completos para enviar la solicitud a aprobación.
                </p>
            </div>
        </div>
    );
}
