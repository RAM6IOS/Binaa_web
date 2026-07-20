import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PWAProvider } from "@/components/providers/PWAProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Auth.Login' });

  return {
    title: {
      template: '%s | Binaa',
      default: 'Binaa - Construction Management Platform',
    },
    description: "B2B SaaS platform for public works contractors in Algeria.",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Binaa",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? cairo.variable : inter.variable;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${fontClass} font-sans antialiased bg-background text-foreground`}>
        <NextIntlClientProvider messages={messages}>
          <PWAProvider>
            {children}
            <Toaster position={locale === 'ar' ? "top-left" : "top-right"} />
          </PWAProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

