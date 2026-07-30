import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && !openaiApiKey) {
      return NextResponse.json(
        { error: "مفتاح Gemini API (GEMINI_API_KEY) غير مُعرّف في ملف .env.local." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    if (geminiApiKey) {
      const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp"
      ];

      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const validModels = modelsData.models
            ?.filter((m: any) => 
              m.supportedGenerationMethods?.includes("generateContent") &&
              !m.name.includes("2.5") &&
              (m.name.includes("flash") || m.name.includes("pro"))
            )
            .map((m: any) => m.name.replace("models/", ""));
          
          if (validModels && validModels.length > 0) {
            modelsToTry.unshift(...validModels);
          }
        }
      } catch (e) {
        console.error("Error listing Gemini models:", e);
      }

      const uniqueModels = Array.from(new Set(modelsToTry));
      let lastError = "";

      for (const modelToUse of uniqueModels) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Analyze this image containing a bill of quantities / contract items table (BPU / Métrés). Extract all rows into a valid JSON array of objects with keys: item_number (string), designation (string), unit (string), quantity (number), unit_price (number), notes (string). Return ONLY valid JSON array without markdown code blocks."
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const items = JSON.parse(cleanedText);
            return NextResponse.json({ items });
          }
        } else {
          const errText = await response.text();
          lastError = `Model ${modelToUse}: ${errText}`;
        }
      }

      throw new Error(`Gemini API error across models: ${lastError}`);
    }

    return NextResponse.json({ error: "Failed to extract contract items from image" }, { status: 500 });
  } catch (error: any) {
    console.error("AI Image Extraction Error:", error);
    return NextResponse.json({ error: error.message || "Extraction failed" }, { status: 500 });
  }
}
