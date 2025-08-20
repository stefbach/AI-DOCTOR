// app/api/test-post/route.ts
import { NextRequest, NextResponse } from "next/server"

const DIAGNOSTIC_FIRST_PROMPT =
  "You are a medical assistant. Provide the most likely diagnosis for the given case.";
const TREATMENT_SECOND_PROMPT =
  "Given the confirmed diagnosis, outline an appropriate treatment plan.";

async function callOpenAIForDiagnosis(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI diagnosis failed: ${response.status}`);
  }

  const data = await response.json();
  const diagnosis = data.choices?.[0]?.message?.content?.trim();
  if (!diagnosis) {
    throw new Error("No diagnosis returned");
  }
  return diagnosis;
}

async function callOpenAIForTreatment(
  prompt: string,
  diagnosis: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "user", content: `${prompt}\nDiagnosis: ${diagnosis}` },
      ],
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI treatment failed: ${response.status}`);
  }

  const data = await response.json();
  const treatment = data.choices?.[0]?.message?.content?.trim();
  if (!treatment) {
    throw new Error("No treatment returned");
  }
  return treatment;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userContext = body?.context || "";

    const diagnosis = await callOpenAIForDiagnosis(
      `${DIAGNOSTIC_FIRST_PROMPT}\n${userContext}`
    );

    if (!diagnosis) {
      return NextResponse.json(
        { error: "Invalid diagnosis" },
        { status: 500 }
      );
    }

    const treatment = await callOpenAIForTreatment(
      TREATMENT_SECOND_PROMPT,
      diagnosis
    );

    return NextResponse.json({
      success: true,
      diagnosis,
      treatment,
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
