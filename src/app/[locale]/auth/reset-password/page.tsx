import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | Binaa",
  description: "قم بتعيين كلمة مرور جديدة لحسابك",
};

export default async function ResetPasswordPage() {
  return <ResetPasswordForm />;
}

