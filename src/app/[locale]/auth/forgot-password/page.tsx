import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "نسيت كلمة المرور | Binaa",
  description: "إعادة تعيين كلمة المرور الخاصة بك",
};

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

