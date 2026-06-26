"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading?: boolean;
    isAr: boolean;
}

export function DeleteConfirmationDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    title,
    description,
    isLoading,
    isAr,
}: Props) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl" dir={isAr ? "rtl" : "ltr"}>
                {/* هيدر جمالي بلون أحمر للتحذير */}
                <div className="bg-red-50 dark:bg-red-950/20 p-6 flex flex-col items-center gap-3 text-center border-b dark:border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-red-900 dark:text-red-200">
                        {title}
                    </AlertDialogTitle>
                </div>

                <div className="p-6 space-y-6">
                    <AlertDialogDescription className="text-center text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {description}
                    </AlertDialogDescription>

                    <AlertDialogFooter className="flex flex-row gap-3 sm:justify-center w-full pt-2">
                        <AlertDialogCancel asChild>
                            <Button variant="outline" className="flex-1 h-11 font-semibold" disabled={isLoading}>
                                {isAr ? "إلغاء" : "Annuler"}
                            </Button>
                        </AlertDialogCancel>

                        <Button
                            variant="destructive"
                            className="flex-1 h-11 font-bold shadow-lg shadow-red-200 dark:shadow-none"
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                            ) : (
                                <Trash2 className="w-4 h-4 ml-2" />
                            )}
                            {isAr ? "تأكيد الحذف" : "Confirmer"}
                        </Button>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}