"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { 
  Building2, 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface NavbarProps {
  locale: string;
}

export function Navbar({ locale }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isAr = locale === 'ar';

  const navLinks = [
    { name: isAr ? "الرئيسية" : "Accueil", href: "/" },
    { name: isAr ? "المميزات" : "Fonctionnalités", href: "/#features" },
    { name: isAr ? "الأسعار" : "Tarifs", href: "/#pricing" },
    { name: isAr ? "اتصل بنا" : "Contact", href: "/#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-blue-900">Binaa</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="hover:text-blue-600 transition-colors"
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
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" asChild>
              <Link href="/auth/register">
                {isAr ? "ابدأ مجاناً" : "Essayer gratuitement"}
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle & Language Switcher */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button 
              className="p-3 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden bg-white border-b border-slate-100 overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 space-y-4">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="block py-3 px-2 text-slate-600 text-base font-medium rounded-md hover:bg-slate-50 transition-colors"
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
                <Button size="lg" className="w-full bg-blue-600 text-white text-base h-12" asChild>
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
