import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentosRequeridos, DocumentoRequerido } from '@/components/forms/DocumentosRequeridos';
import { vinculacionAPI, terceroAPI } from '@/lib/api';

interface DocumentosTabProps {
    terceroId: number;
    documentosRequeridos: DocumentoRequerido[];
    tipoPersona: "NATURAL" | "JURIDICA";
    onComplete?: () => void;
}

export default function DocumentosTab({ terceroId, documentosRequeridos, tipoPersona, onComplete }: DocumentosTabProps) {
    const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'success' | 'error'>>({});
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [personaChangeMessage, setPersonaChangeMessage] = useState<string>('');
    const [resetCounter, setResetCounter] = useState(0);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const previousTipoPersonaRef = useRef<"NATURAL" | "JURIDICA">(tipoPersona);

    // Cargar estado inicial de documentos desde el backend
    useEffect(() => {
        const loadDocumentosStatus = async () => {
            try {
                const status = await terceroAPI.getStatus(terceroId);

                // Inicializar uploadProgress con documentos ya cargados
                const initialProgress: Record<string, 'uploading' | 'success' | 'error'> = {};

                if (status.documentos?.items) {
                    status.documentos.items.forEach((doc: any) => {
                        if (doc.cargado && doc.estado === 'CARGADO') {
                            initialProgress[doc.code] = 'success';
                        }
                    });
                }

                setUploadProgress(initialProgress);
            } catch (err) {
                console.error('Error al cargar estado de documentos:', err);
            } finally {
                setLoadingInitial(false);
            }
        };

        loadDocumentosStatus();
    }, [terceroId]);

    // Detectar cambio de tipo_persona y limpiar archivos que ya no aplican
    useEffect(() => {
        if (previousTipoPersonaRef.current !== tipoPersona) {
            // Obtener códigos de documentos que aplican al nuevo tipo
            const validCodes = new Set(
                documentosRequeridos.map(d => d.documento_tipo_code)
            );

            // Filtrar archivos seleccionados para mantener solo los que aplican
            const filteredFiles: Record<string, File> = {};
            let removedCount = 0;

            for (const [code, file] of Object.entries(documentFiles)) {
                if (validCodes.has(code)) {
                    filteredFiles[code] = file;
                } else {
                    removedCount++;
                }
            }

            // Actualizar estados si se removieron archivos
            if (removedCount > 0) {
                setDocumentFiles(filteredFiles);
                setUploadProgress({});
                setError('');
                setSuccess(false);

                // Mostrar mensaje informativo
                const personaText = tipoPersona === "NATURAL" ? "Persona Natural" : "Persona Jurídica";
                setPersonaChangeMessage(
                    `Se limpió la selección de ${removedCount} documento(s) que no aplica(n) para ${personaText}`
                );

                // Limpiar mensaje después de 5 segundos
                setTimeout(() => setPersonaChangeMessage(''), 5000);
            }

            previousTipoPersonaRef.current = tipoPersona;
        }
    }, [tipoPersona, documentFiles, documentosRequeridos]);

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
            setResetCounter(prev => prev + 1); // Trigger reset en el hijo
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
    const documentosYaCargados = Object.keys(uploadProgress).filter(code => uploadProgress[code] === 'success');

    // Mostrar loader inicial mientras se carga el estado
    if (loadingInitial) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Cargando estado de documentos...</p>
                </div>
            </div>
        );
    }

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
                <p className="text-sm text-primary font-medium mt-2">
                    Mostrando documentos para: {tipoPersona === "NATURAL" ? "Persona Natural" : "Persona Jurídica"}
                </p>
            </div>

            {/* Mensaje cuando se cambia tipo_persona */}
            {personaChangeMessage && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            {personaChangeMessage}
                        </p>
                    </div>
                </div>
            )}

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
                resetTrigger={resetCounter}
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
            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
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
                {documentosYaCargados.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 dark:text-green-400">
                            {documentosYaCargados.length} documento(s) ya cargado(s) anteriormente
                        </span>
                    </div>
                )}
            </div>

            {/* Botón de carga */}
            <div className="mt-6 flex justify-end gap-3">
                {Object.keys(documentFiles).length > 0 && !uploading && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setDocumentFiles({});
                            setUploadProgress({});
                            setResetCounter(prev => prev + 1); // Trigger reset en el hijo
                        }}
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
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <p>
                        <strong className="text-foreground">Nota:</strong> Puede cargar los documentos en múltiples sesiones.
                        Los documentos obligatorios deben estar completos para enviar la solicitud a aprobación.
                    </p>
                </div>
            </div>
        </div>
    );
}
