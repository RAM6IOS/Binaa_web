"use client";

import React from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { BrandLogo } from "@/components/brand/BrandLogo";

export function AuthNavbar() {
  const t = useTranslations('Navigation');
  const ta = useTranslations('Auth');
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === "ar";
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isLoginPage = pathname?.includes("/auth/login");
  const isRegisterPage = pathname?.includes("/auth/register");

  const navLinks = [
    { name: t('home'), href: `/` },
    { name: t('features'), href: `/#features` },
    { name: t('pricing'), href: `/#pricing` },
    { name: t('contact'), href: `/#contact` },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href={`/`} className="flex items-center gap-2.5 group transition-all">
            <BrandLogo size={44} className="group-hover:scale-105 transition-transform" />
            <span className="sr-only">Binaa</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="hover:text-primary transition-colors relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            <Button variant="ghost" asChild className="font-bold text-muted-foreground hover:text-primary px-4">
              <Link href="/">
                {t('home')}
              </Link>
            </Button>
            
            {!isLoginPage && (
              <Button variant="outline" asChild className="font-bold border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30 rounded-lg px-6 transition-all">
                <Link href="/auth/login">
                  {ta('Login.title')}
                </Link>
              </Button>
            )}
            
            {!isRegisterPage && (
              <Button 
                asChild 
                className="shadow-sm hover:-translate-y-0.5"
              >
                <Link href="/auth/register">
                  {ta('Register.submit')}
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden bg-background border-b border-border overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block py-3 px-4 rounded-lg text-muted-foreground font-medium hover:bg-primary/10 hover:text-primary transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 grid grid-cols-2 gap-3">
                {!isLoginPage && (
                  <Button variant="outline" className="rounded-lg h-12 font-bold border-primary/20 text-primary" asChild>
                    <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                      {ta('Login.title')}
                    </Link>
                  </Button>
                )}
                {!isRegisterPage && (
                  <Button className={`shadow-sm rounded-lg h-12 font-bold ${isLoginPage ? 'col-span-2' : ''}`} asChild>
                    <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                      {ta('Register.submit')}
                    </Link>
                  </Button>
                )}
                {isRegisterPage && (
                  <Button variant="outline" className="rounded-lg h-12 font-bold col-span-2" asChild>
                    <Link href="/" onClick={() => setIsMenuOpen(false)}>
                      {t('backToHome')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
    </nav>
  );
}
