import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request or fallback to default
  const locale = (await requestLocale) || routing.defaultLocale;

  // Ensure that a valid locale is used, otherwise fallback to default
  const finalLocale = routing.locales.includes(locale as any) 
    ? locale 
    : routing.defaultLocale;

  return {
    locale: finalLocale,
    messages: (await import(`../../messages/${finalLocale}.json`)).default
  };
});
