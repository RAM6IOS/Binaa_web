import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/contact
 * حفظ رسالة اتصال من زائر غير مسجَّل عبر سياسة RLS (إدراج فقط).
 * التحقق الكامل في حدود الخادم عبر Zod — لا يُثق بأي حقل من المتصفح.
 */
const ContactMessageSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(254).email(),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => (value ? value : null)),
  subject: z.enum(['inquiry', 'demo', 'partnership']),
  message: z.string().trim().min(10).max(2000),
  locale: z.enum(['ar', 'fr']).default('ar'),
});

const TABLE_NOT_FOUND_CODES = new Set(["42P01", "PGRST205"]);

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const parsed = ContactMessageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('contact_messages')
      .insert(parsed.data)
      .select('id')
      .single();

    if (error) {
      // الجدول غير منشأ بعد في قاعدة البيانات — رسالة ودّية بدل خطأ عام.
      if (error.code && TABLE_NOT_FOUND_CODES.has(error.code)) {
        return NextResponse.json({ error: 'not_configured' }, { status: 503 });
      }
      console.error('contact_messages insert error:', error);
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contact error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}