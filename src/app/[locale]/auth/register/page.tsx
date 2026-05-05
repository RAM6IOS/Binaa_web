import { RegisterForm } from "@/components/auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "إنشاء حساب جديد | Binaa",
  description: "انضم إلى منصة بناء وابدأ في إدارة مشاريعك باحترافية",
};

export default async function RegisterPage() {
  return <RegisterForm />;
}

