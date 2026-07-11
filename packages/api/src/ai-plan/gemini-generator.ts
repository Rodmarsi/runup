import { AppError } from "../errors.js";
import { interpretedPlanSchema, type InterpretedPlan } from "../excel-import/schema.js";
import { extractJson } from "../excel-import/prompt.js";
import type { GeneratePlanInput } from "./schemas.js";
import type { PlanSlot } from "./slots.js";
import type { PlanGenerator } from "./generator.js";
import { SYSTEM_PROMPT, buildPrompt } from "./prompt.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
}

/** Gerador via Google Gemini (camada gratuita do AI Studio). */
export class GeminiPlanGenerator implements PlanGenerator {
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
        "Criação de plano por IA indisponível: defina GEMINI_API_KEY",
      );
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(input: GeneratePlanInput, slots: PlanSlot[]): Promise<InterpretedPlan> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(input, slots) }] }],
        generationConfig: { responseMimeType: "application/json" },
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
