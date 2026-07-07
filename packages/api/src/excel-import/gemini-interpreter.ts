import { AppError } from "../errors.js";
import type { SheetMatrix } from "./extract.js";
import { interpretedPlanSchema, type InterpretedPlan } from "./schema.js";
import type { InterpretContext, SpreadsheetInterpreter } from "./interpreter.js";
import { SYSTEM_PROMPT, buildPrompt, extractJson } from "./prompt.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
}

/**
 * Interpretador via Google Gemini (camada gratuita do AI Studio).
 * Mesma interface do ClaudeInterpreter — o pipeline não muda.
 */
export class GeminiInterpreter implements SpreadsheetInterpreter {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
  ) {
    if (!apiKey) {
      throw new AppError(
        500,
        "AI_NOT_CONFIGURED",
        "Importação por IA indisponível: defina GEMINI_API_KEY",
      );
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async interpret(
    sheets: SheetMatrix[],
    context: InterpretContext,
  ): Promise<InterpretedPlan> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: "user", parts: [{ text: buildPrompt(sheets, context) }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (!res.ok) {
      throw new AppError(
        502,
        "AI_ERROR",
        `Falha na IA (Gemini): ${data.error?.message ?? res.status}`,
      );
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    if (!text) {
      throw new AppError(502, "AI_INVALID_OUTPUT", "A IA não retornou conteúdo");
    }

    const parsed = interpretedPlanSchema.safeParse(extractJson(text));
    if (!parsed.success) {
      throw new AppError(
        502,
        "AI_INVALID_OUTPUT",
        "A IA retornou um plano em formato inesperado",
        parsed.error.flatten(),
      );
    }
    return parsed.data;
  }
}
