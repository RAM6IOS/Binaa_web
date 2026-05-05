import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "التحقق من الرمز | Binaa",
  description: "أدخل رمز التحقق لإعادة تعيين كلمة المرور",
};

export default async function VerifyOtpPage() {
  return <VerifyOtpForm />;
}

