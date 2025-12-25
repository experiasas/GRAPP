import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Receipt, Building2 } from "lucide-react";
import { VinculacionTercerosForm } from "@/components/forms/VinculacionTercerosForm";
import { RadicacionCuentaForm } from "@/components/forms/RadicacionCuentaForm";
import { SuccessScreen } from "@/components/forms/SuccessScreen";

type FormType = "terceros" | "cuentas" | null;
type ViewState = "select" | "form" | "success";

const Index = () => {
    const [searchParams] = useSearchParams();
    const initialForm = searchParams.get("form") as FormType;

    const [selectedForm, setSelectedForm] = useState<FormType>(initialForm);
    const [viewState, setViewState] = useState<ViewState>(initialForm ? "form" : "select");
    const [successData, setSuccessData] = useState<any>(null);

    const handleFormSelect = (form: FormType) => {
        setSelectedForm(form);
        setViewState("form");
    };

    const handleTercerosSuccess = (data: any) => {
        setSuccessData({
            type: "terceros",
            nombre: data.tipo_persona === "JURIDICA" ? data.razon_social : `${data.nombre1} ${data.apellido1}`,
            documento: `${data.tipo_doc} ${data.documento}`,
            email: data.email,
        });
        setViewState("success");
    };

    const handleCuentasSuccess = (data: any) => {
        setSuccessData({
            type: "cuentas",
            numero: data.numero,
            periodo: data.periodo,
            valor: data.valor,
            archivo: data.fileName || "Sin archivo",
        });
        setViewState("success");
    };

    const handleReset = () => {
        setSelectedForm(null);
        setViewState("select");
        setSuccessData(null);
    };

    // Pantalla de éxito
    if (viewState === "success" && successData) {
        const isTereceros = successData.type === "terceros";
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-semibold text-foreground">GRAPP</span>
                        </div>
                    </div>
                </header>
                <SuccessScreen
                    title={isTereceros ? "¡Vinculación Exitosa!" : "¡Cuenta Radicada!"}
                    subtitle={isTereceros
                        ? "El tercero ha sido registrado correctamente en el sistema"
                        : "Su cuenta de cobro ha sido radicada exitosamente"
                    }
                    details={isTereceros ? [
                        { label: "Nombre/Razón Social", value: successData.nombre },
                        { label: "Documento", value: successData.documento },
                        { label: "Email", value: successData.email },
                        { label: "Estado", value: "Pendiente de aprobación" },
                    ] : [
                        { label: "Número de Cuenta", value: successData.numero },
                        { label: "Periodo", value: successData.periodo },
                        { label: "Valor", value: successData.valor },
                        { label: "Archivo", value: successData.archivo },
                        { label: "Estado", value: "Radicada" },
                    ]}
                    onGoHome={handleReset}
                    onNewAction={handleReset}
                    newActionLabel={isTereceros ? "Vincular otro tercero" : "Radicar otra cuenta"}
                />
            </div>
        );
    }

    // Formularios
    if (viewState === "form" && selectedForm) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border bg-card sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <button onClick={handleReset} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <span className="text-xl font-semibold text-foreground">GRAPP</span>
                            </button>
                            <span className="text-sm text-muted-foreground">
                                {selectedForm === "terceros" ? "Vinculación de Terceros" : "Radicación de Cuenta"}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8 max-w-3xl">
                    <div className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                            {selectedForm === "terceros" ? "Vinculación de Terceros" : "Radicación de Cuenta de Cobro"}
                        </h1>
                        <p className="text-muted-foreground">
                            {selectedForm === "terceros"
                                ? "Complete el formulario para registrar un nuevo tercero en el sistema"
                                : "Ingrese la información de su cuenta de cobro para radicarla"
                            }
                        </p>
                    </div>

                    {selectedForm === "terceros" ? (
                        <VinculacionTercerosForm onSuccess={handleTercerosSuccess} />
                    ) : (
                        <RadicacionCuentaForm onSuccess={handleCuentasSuccess} proveedorNombre="Proveedor Ejemplo S.A.S" />
                    )}
                </main>
            </div>
        );
    }

    // Selector de formulario
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-semibold text-foreground">GRAPP</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Gestión de Recursos Administrativos
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Seleccione la operación que desea realizar
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => handleFormSelect("terceros")}
                        className="form-section group hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg transition-all duration-300 text-left"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-background group-hover:text-primary transition-colors">
                                <Users className="w-7 h-7 text-primary group-hover:text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary-foreground mb-2">Vinculación de Terceros</h3>
                                <p className="text-muted-foreground group-hover:text-primary-foreground/90">
                                    Registre proveedores, contratistas o clientes en el sistema
                                </p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleFormSelect("cuentas")}
                        className="form-section group hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg transition-all duration-300 text-left"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-background group-hover:text-primary transition-colors">
                                <Receipt className="w-7 h-7 text-primary group-hover:text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary-foreground mb-2">Radicación de Cuenta de Cobro</h3>
                                <p className="text-muted-foreground group-hover:text-primary-foreground/90">
                                    Radique su cuenta de cobro como proveedor o contratista
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Index;
