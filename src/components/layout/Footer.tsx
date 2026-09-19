import { Link } from "@/i18n/routing";
import { Building2 as Logo, Mail, Phone, Users, FileText } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mohmedbouc4@gmail.com";

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const isAr = locale === "ar";

  const menuLinks = [
    { name: isAr ? "المميزات" : "Fonctionnalités", href: "/#features" },
    { name: isAr ? "تحديثات النظام" : "Mises à jour", href: "#" },
    { name: isAr ? "دليل الاستخدام" : "Guide d'utilisation", href: "#" },
  ];

  const companyLinks = [
    { name: isAr ? "اتصل بنا" : "Contact", href: "/contact" },
  ];

  return (
    <footer className="bg-muted border-t border-border pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
              <BrandLogo size={40} />
              <span className="sr-only">Binaa</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isAr
                ? "المنصة الأولى في الجزائر المتخصصة في إدارة مشاريع الأشغال العمومية والإنشاءات الكبرى."
                : "La première plateforme en Algérie pour la gestion des travaux publics et des grands projets de construction."}
            </p>
            <div className="mt-8 flex gap-4">
              <div className="w-10 h-10 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">
              {isAr ? "المنصة" : "Plateforme"}
            </h4>
            <ul className="space-y-4 text-muted-foreground text-sm">
              {menuLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">
              {isAr ? "الشركة" : "Entreprise"}
            </h4>
            <ul className="space-y-4 text-muted-foreground text-sm">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">
              {isAr ? "تواصل معنا" : "Contactez-nous"}
            </h4>
            <ul className="space-y-4 text-muted-foreground text-sm">
              <li className="flex items-center gap-3">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  0553058879
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-6 justify-center">
            <Link href="#" className="hover:text-primary transition-colors">
              {isAr ? "سياسة الخصوصية" : "Confidentialité"}
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              {isAr ? "شروط الخدمة" : "Conditions d'utilisation"}
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              {isAr ? "ملفات تعريف الارتباط" : "Cookies"}
            </Link>
          </div>
          <p>
            {isAr
              ? "© 2026 Binaa — جميع الحقوق محفوظة لشركة بيناء تكنولوجي."
              : "© 2026 Binaa — Tous droits réservés, Binaa Technologie."}
          </p>
        </div>
      </div>
    </footer>
  );
}