import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS temperature_min NUMERIC;`
  });

  if (error && !error.message.includes('does not exist')) {
    return NextResponse.json({ 
      message: 'Manual migration required.',
      sql_to_run: `ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS temperature_min NUMERIC;`
    }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'temperature_min column added!' });
}
