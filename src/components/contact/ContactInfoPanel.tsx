"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Mail, Phone, Clock, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export function ContactInfoPanel() {
  const t = useTranslations("Contact.Info");
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    if (!CONTACT_EMAIL) return;
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success(t("copySuccess"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  };

  const rows = [
    { icon: Mail, label: t("emailLabel"), value: CONTACT_EMAIL || "—" },
    { icon: Phone, label: t("phoneLabel"), value: t("phoneValue") },
    { icon: Clock, label: t("hoursLabel"), value: t("hoursValue") },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <h3 className="text-base font-semibold tracking-tight">
            {t("title")}
          </h3>
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                <row.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="text-sm text-foreground break-all">{row.value}</p>
              </div>
            </div>
          ))}
          {CONTACT_EMAIL ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleCopyEmail}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? t("copySuccess") : t("emailCopy")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}