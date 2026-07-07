import type { SheetMatrix } from "./extract.js";
import type { InterpretedPlan } from "./schema.js";

export interface InterpretContext {
  /** Prova alvo do aluno, se houver — ajuda a IA a inferir intenção. */
  targetRace?: string;
  raceDate?: string;
}

/**
 * Interface do interpretador de planilhas. Isola a chamada de IA para que o
 * resto do pipeline seja testável com um mock (sem credenciais).
 */
export interface SpreadsheetInterpreter {
  interpret(
    sheets: SheetMatrix[],
    context: InterpretContext,
  ): Promise<InterpretedPlan>;
}
