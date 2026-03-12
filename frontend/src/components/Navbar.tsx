import { useNavigate } from 'react-router-dom';

interface NavbarProps {
    /** Texto a mostrar en el lado derecho del navbar */
    subtitle?: string;
    /** Si es true, el logo es clickeable y navega al inicio */
    clickable?: boolean;
    /** Handler personalizado para click en el logo */
    onLogoClick?: () => void;
    /** Contenido adicional para mostrar en el lado derecho */
    rightContent?: React.ReactNode;
    /** Si es true, el navbar es sticky */
    sticky?: boolean;
}

/**
 * Componente Navbar reutilizable con el logo de Experias
 * Usado como header consistente en todas las páginas de la aplicación
 */
export const Navbar = ({
    subtitle,
    clickable = true,
    onLogoClick,
    rightContent,
    sticky = true
}: NavbarProps) => {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
        } else if (clickable) {
            navigate('/');
        }
    };

    const LogoContent = () => (
        <div className="flex items-center gap-3">
            <img
                src="/explogo.png"
                alt="Experias S.A.S."
                className="h-10 w-auto object-contain"
            />
        </div>
    );

    return (
        <header className={`border-b border-border bg-card ${sticky ? 'sticky top-0 z-50' : ''}`}>
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo Section */}
                    {clickable ? (
                        <button
                            onClick={handleLogoClick}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                        >
                            <LogoContent />
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <LogoContent />
                        </div>
                    )}

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {subtitle && (
                            <span className="text-sm text-muted-foreground font-medium hidden sm:block">
                                {subtitle}
                            </span>
                        )}
                        {rightContent}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
