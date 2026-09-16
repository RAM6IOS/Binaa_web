import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactInfoPanel } from "@/components/contact/ContactInfoPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact.Page" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact.Page");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar locale={locale} />
      <PageContainer
        dir={dir}
        header={{ title: t("title"), description: t("description") }}
        className="max-w-6xl mx-auto mt-24 px-4 md:px-8"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <ContactForm />
            </CardContent>
          </Card>
          <ContactInfoPanel />
        </div>
      </PageContainer>
      <Footer locale={locale} />
    </div>
  );
}