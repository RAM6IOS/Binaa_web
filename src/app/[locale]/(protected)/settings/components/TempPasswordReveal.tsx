"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound } from "lucide-react";

interface TempPasswordRevealProps {
  isAr: boolean;
  tempPassword: string;
  email?: string | null;
}

/** عرض كلمة مرور مؤقتة مرة واحدة فقط مع زر نسخ — يُستخدم بعد الإنشاء أو إعادة التعيين. */
export function TempPasswordReveal({ isAr, tempPassword, email }: TempPasswordRevealProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-center space-y-2">
      {email ? (
        <p className="text-xs text-muted-foreground">
          {isAr ? "البريد" : "Email"}:{" "}
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
        </p>
      ) : null}
      <div className="flex items-center justify-center gap-2">
        <KeyRound className="h-5 w-5 text-warning" aria-hidden="true" />
        <code dir="ltr" className="text-lg font-bold tracking-wider">
          {tempPassword}
        </code>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            navigator.clipboard?.writeText(tempPassword).catch(() => null);
            setCopied(true);
          }}
          aria-label={isAr ? "نسخ كلمة المرور" : "Copier le mot de passe"}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {copied ? (
        <p className="text-xs text-success">{isAr ? "تم النسخ" : "Copié"}</p>
      ) : null}
    </div>
  );
}