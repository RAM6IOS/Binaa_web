"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Mail, User, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUBJECTS = ["inquiry", "demo", "partnership"] as const;
type Subject = (typeof SUBJECTS)[number];

const initialFormData = {
  full_name: "",
  email: "",
  phone: "",
  subject: "inquiry" as Subject,
  message: "",
};

export function ContactForm() {
  const t = useTranslations("Contact.Form");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    e.currentTarget.setCustomValidity("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone || null,
          locale,
        }),
      });

      if (response.status === 503) {
        toast.error(t("messages.errorNotConfigured"));
      } else if (response.ok) {
        toast.success(t("messages.success"));
        setFormData(initialFormData);
      } else {
        toast.error(t("messages.error"));
      }
    } catch {
      toast.error(t("messages.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            id="full_name"
            placeholder={t("fullNamePlaceholder")}
            value={formData.full_name}
            onChange={handleChange}
            onInvalid={(e) => {
              if (e.currentTarget.validity.valueMissing) {
                e.currentTarget.setCustomValidity(tc("validation.fieldRequired"));
              }
            }}
            required
            disabled={loading}
            className="pl-10 rtl:pl-3 rtl:pr-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              onInvalid={(e) => {
                if (e.currentTarget.validity.valueMissing) {
                  e.currentTarget.setCustomValidity(tc("validation.emailRequired"));
                } else if (e.currentTarget.validity.typeMismatch) {
                  e.currentTarget.setCustomValidity(tc("validation.emailInvalid"));
                }
              }}
              required
              disabled={loading}
              className="pl-10 rtl:pl-3 rtl:pr-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input
              id="phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              className="pl-10 rtl:pl-3 rtl:pr-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("subject")}</Label>
        <Select
          value={formData.subject}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              subject: value as (typeof SUBJECTS)[number],
            })
          }
          disabled={loading}
        >
          <SelectTrigger className="h-11 md:h-10" aria-label={t("subject")}>
            <SelectValue placeholder={t("subjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`subjects.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t("message")}</Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Textarea
            id="message"
            placeholder={t("messagePlaceholder")}
            value={formData.message}
            onChange={handleChange}
            onInvalid={(e) => {
              if (e.currentTarget.validity.valueMissing) {
                e.currentTarget.setCustomValidity(tc("validation.fieldRequired"));
              }
            }}
            required
            disabled={loading}
            className="pl-10 rtl:pl-3 rtl:pr-10 min-h-32"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={loading}>
        {loading ? <Loader2 className="size-5 animate-spin" /> : null}
        {t("submit")}
      </Button>
    </form>
  );
}