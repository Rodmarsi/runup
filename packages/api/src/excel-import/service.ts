import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { PlanService } from "../plans/service.js";
import type { CreatePlanInput } from "../plans/schemas.js";
import { extractMatrices } from "./extract.js";
import type { SpreadsheetInterpreter } from "./interpreter.js";
import type { InterpretedPlan } from "./schema.js";

export interface ImportPreview {
  plan: InterpretedPlan;
  summary: {
    weeks: number;
    days: number;
    lowConfidence: number;
  };
}

export class ExcelImportService {
  private readonly plans: PlanService;

  constructor(
    private readonly db: PrismaClient,
    private readonly interpreter: SpreadsheetInterpreter,
  ) {
    this.plans = new PlanService(db);
  }

  private async assertActiveLink(coachId: string, studentId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    });
    if (!link || link.status !== "active") throw errors.notLinked();
  }

  /**
   * Etapas 1–3: extrai a planilha (SheetJS), interpreta com IA e valida.
   * Retorna um preview para a tela de revisão — NADA é salvo aqui.
   */
  async interpret(
    coachId: string,
    studentId: string,
    base64: string,
  ): Promise<ImportPreview> {
    await this.assertActiveLink(coachId, studentId);

    const sheets = extractMatrices(base64);
    if (sheets.length === 0 || sheets.every((s) => s.rows.length === 0)) {
      throw errors.validation("Planilha vazia ou ilegível");
    }

    const goal = await this.db.goal.findFirst({
      where: { studentId, status: "active" },
      orderBy: { raceDate: "asc" },
    });

    const plan = await this.interpreter.interpret(sheets, {
      targetRace: goal?.targetRace,
      raceDate: goal?.raceDate.toISOString().slice(0, 10),
    });

    const weeks = new Set(plan.days.map((d) => d.week)).size;
    const lowConfidence = plan.days.filter(
      (d) => d.confidence === "low",
    ).length;

    return {
      plan,
      summary: { weeks, days: plan.days.length, lowConfidence },
    };
  }

  /**
   * Etapa 5: persiste o plano revisado/confirmado pelo treinador.
   * Recebe já no formato final (a tela de revisão resolveu datas e correções).
   */
  confirm(coachId: string, input: CreatePlanInput) {
    return this.plans.createPlan(coachId, input);
  }
}
