import type { ElementType, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
    icon: ElementType;
    iconBg: string;
    iconColor: string;
    value: ReactNode;
    label: string;
    badge?: ReactNode;
    loading?: boolean;
    className?: string;
}

export function StatCard({
    icon: Icon,
    iconBg,
    iconColor,
    value,
    label,
    badge,
    loading,
    className,
}: StatCardProps) {
    return (
        <Card className={`p-5 ${className ?? ""}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={iconColor} />
                </div>
                {badge}
            </div>
            {loading ? (
                <div className="space-y-1.5">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ) : (
                <>
                    <p className="text-[26px] font-bold text-foreground tabular-nums leading-tight">
                        {value}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1">{label}</p>
                </>
            )}
        </Card>
    );
}
