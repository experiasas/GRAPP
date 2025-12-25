import { CheckCircle2, Home, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
    title: string;
    subtitle: string;
    details: { label: string; value: string }[];
    onNewAction?: () => void;
    onGoHome?: () => void;
    newActionLabel?: string;
}

export function SuccessScreen({
    title,
    subtitle,
    details,
    onNewAction,
    onGoHome,
    newActionLabel = "Realizar otra operación",
}: SuccessScreenProps) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center animate-in">
                {/* Icono de éxito */}
                <div className="mb-8">
                    <div className="w-24 h-24 rounded-full bg-success/10 mx-auto flex items-center justify-center success-checkmark">
                        <CheckCircle2 className="w-12 h-12 text-success" />
                    </div>
                </div>

                {/* Título y subtítulo */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
                    <p className="text-lg text-muted-foreground">{subtitle}</p>
                </div>

                {/* Detalles de la operación */}
                <div className="form-section mb-8">
                    <div className="divide-y divide-border">
                        {details.map((detail, index) => (
                            <div key={index} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                                <span className="text-sm text-muted-foreground">{detail.label}</span>
                                <span className="font-medium text-foreground">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mensaje informativo */}
                <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-8">
                    <div className="flex items-start gap-3 text-left">
                        <FileText className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-foreground">¿Qué sigue?</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Su solicitud ha sido registrada y será revisada por nuestro equipo.
                                Recibirá una notificación cuando haya novedades.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {onGoHome && (
                        <Button variant="outline" onClick={onGoHome} className="h-12 px-6">
                            <Home className="w-5 h-5 mr-2" />
                            Volver al inicio
                        </Button>
                    )}
                    {onNewAction && (
                        <Button onClick={onNewAction} className="h-12 px-6">
                            {newActionLabel}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
