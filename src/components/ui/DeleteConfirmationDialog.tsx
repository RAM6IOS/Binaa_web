"use client";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle, Ban } from "lucide-react";

interface Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading?: boolean;
    isAr: boolean;
    disableMode?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function DeleteConfirmationDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    title,
    description,
    isLoading,
    isAr,
    disableMode,
    confirmLabel,
    cancelLabel,
}: Props) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-border shadow-md" dir={isAr ? "rtl" : "ltr"}>
                <div className={`p-6 flex flex-col items-center gap-3 text-center border-b border-border ${disableMode ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${disableMode ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}`}>
                        {disableMode ? <Ban className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <AlertDialogTitle className={`text-xl font-bold ${disableMode ? 'text-warning' : 'text-destructive'}`}>
                        {title}
                    </AlertDialogTitle>
                </div>

                <div className="p-6 space-y-6">
                    <AlertDialogDescription className="text-center text-muted-foreground text-sm leading-relaxed">
                        {description}
                    </AlertDialogDescription>

                    <AlertDialogFooter className="flex flex-row gap-3 sm:justify-center w-full pt-2">
                        <AlertDialogCancel asChild>
                            <Button variant="outline" className="flex-1 h-11 font-semibold" disabled={isLoading}>
                                {cancelLabel || (isAr ? "إلغاء" : "Annuler")}
                            </Button>
                        </AlertDialogCancel>

                        <Button
                            variant={disableMode ? "default" : "destructive"}
                            className={`flex-1 h-11 font-bold shadow-md ${disableMode ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                            ) : disableMode ? (
                                <Ban className="w-4 h-4 ml-2" />
                            ) : (
                                <Trash2 className="w-4 h-4 ml-2" />
                            )}
                            {confirmLabel || (disableMode
                                ? (isAr ? "تعطيل" : "Désactiver")
                                : (isAr ? "تأكيد الحذف" : "Confirmer"))}
                        </Button>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
