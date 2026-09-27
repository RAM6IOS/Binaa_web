import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /**
   * "light": البليت الكحلي الكامل — للأسطح الفاتحة (Navbars, Auth, Footer...).
   * "dark": نسخة شفافة (رمز أبيض/ذهبي بلا خلفية) — للأسطح الداكنة مثل القائمة الجانبية.
   */
  variant?: "light" | "dark";
  /** الارتفاع بالبكسل (مربّع دائماً) */
  size?: number;
  rounded?: boolean;
  className?: string;
  /**
   * الشعار في أول الشاشة المرئي هو غالباً عنصر LCP، و`priority` يجعل Next
   * يحمّله عبر preload بدل انتظار اكتشافه من JS. يُمرَّر فقط للشعار العلوي.
   */
  priority?: boolean;
};

export function BrandLogo({
  variant = "light",
  size = 40,
  rounded = true,
  className,
  priority = false,
}: BrandLogoProps) {
  const src =
    variant === "dark"
      ? "/images/logo/binaa-tile-dark.png"
      : "/images/logo/binaa-tile-light.png";

  return (
    <Image
      src={src}
      alt="Binaa"
      width={size}
      height={size}
      className={cn(rounded && "rounded-lg", "object-contain", className)}
      draggable={false}
      priority={priority}
    />
  );
}