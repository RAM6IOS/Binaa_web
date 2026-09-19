"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface NavbarProps {
  locale: string;
}

export function Navbar({ locale }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isAr = locale === 'ar';

  const navLinks = [
    { name: isAr ? "الرئيسية" : "Accueil", href: "/" },
    { name: isAr ? "المميزات" : "Fonctionnalités", href: "/#features" },
    { name: isAr ? "اتصل بنا" : "Contact", href: "/contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={44} />
            <span className="sr-only">Binaa</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons & Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            
            <Button variant="ghost" asChild>
              <Link href="/auth/login">
                {isAr ? "تسجيل الدخول" : "Connexion"}
              </Link>
            </Button>
            <Button className="shadow-sm" asChild>
              <Link href="/auth/register">
                {isAr ? "ابدأ مجاناً" : "Essayer gratuitement"}
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle & Language Switcher */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              className="p-3 text-muted-foreground rounded-md hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden bg-background border-b border-border overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 space-y-4">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="block py-3 px-2 text-muted-foreground text-base font-medium rounded-md hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 flex flex-col gap-2">
                <Button variant="outline" size="lg" className="w-full text-base h-12" asChild>
                  <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                    {isAr ? "تسجيل الدخول" : "Connexion"}
                  </Link>
                </Button>
                <Button size="lg" className="w-full text-base h-12" asChild>
                  <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                    {isAr ? "ابدأ مجاناً" : "Essayer gratuitement"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
    </nav>
  );
}
