import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sheetUrl = searchParams.get("url");

    if (!sheetUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let csvUrl = sheetUrl.trim();
    if (csvUrl.includes('/edit')) {
      csvUrl = csvUrl.replace(/\/edit.*$/, '/export?format=csv');
    } else if (!csvUrl.includes('export?format=csv')) {
      if (!csvUrl.endsWith('/')) csvUrl += '/';
      csvUrl += 'export?format=csv';
    }

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch Google Sheet. Make sure the sheet is public." }, { status: 400 });
    }

    const csvText = await response.text();
    return NextResponse.json({ csvText });
  } catch (error: any) {
    console.error("Error fetching Google Sheet:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
