import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "../errors.js";
import type { SheetMatrix } from "./extract.js";
import { interpretedPlanSchema, type InterpretedPlan } from "./schema.js";
import type { InterpretContext, SpreadsheetInterpreter } from "./interpreter.js";
import { SYSTEM_PROMPT, buildPrompt, extractJson } from "./prompt.js";

const MODEL = "claude-opus-4-8";

export class ClaudeInterpreter implements SpreadsheetInterpreter {
  private readonly client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new AppError(
        500,
        "AI_NOT_CONFIGURED",
        "Importação por IA indisponível: defina ANTHROPIC_API_KEY",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async interpret(
    sheets: SheetMatrix[],
    context: InterpretContext,
  ): Promise<InterpretedPlan> {
    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(sheets, context) }],
    });
    const message = await stream.finalMessage();

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

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
