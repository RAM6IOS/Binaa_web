import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// API مؤقت لتطبيق migration جدول daily_logs
// يُحذف بعد الاستخدام
export async function POST() {
  const supabase = await createClient();

  // التحقق من وجود الأعمدة ثم الإضافة
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS problems_faced TEXT;`
  });

  if (e1 && !e1.message.includes('does not exist')) {
    // If exec_sql doesn't exist, use a different approach
    return NextResponse.json({ 
      message: 'Manual migration required. See SQL in supabase/migrations folder.',
      sql_to_run: `
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS problems_faced TEXT;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS workers_present JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS equipment_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
`
    }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Migration applied!' });
}
