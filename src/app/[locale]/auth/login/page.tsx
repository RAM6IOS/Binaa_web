import { LoginForm } from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Binaa",
  description: "سجل دخولك إلى منصة بناء لإدارة مشاريعك",
};

export default async function LoginPage() {
  return <LoginForm />;
}

