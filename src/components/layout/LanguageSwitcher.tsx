"use client";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const languages = [
    { code: "ar", name: "العربية", label: "AR" },
    { code: "fr", name: "Français", label: "FR" },
  ];

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold"
        >
          <Globe className="h-4 w-4" />
          <span>{currentLocale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 rounded-xl">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => handleLanguageChange(lang.code)}
          >
            <span className={lang.code === 'ar' ? 'font-cairo' : 'font-sans'}>
              {lang.name}
            </span>
            {currentLocale === lang.code && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

