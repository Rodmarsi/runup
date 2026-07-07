import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractMatrices } from "./extract.js";

/** Constrói um .xlsx (base64) a partir de uma matriz, para os testes. */
export function buildXlsxBase64(rows: (string | number)[][]): string {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Plano");
  return XLSX.write(book, { type: "base64", bookType: "xlsx" });
}

describe("extractMatrices", () => {
  it("lê linhas e colunas da planilha", () => {
    const base64 = buildXlsxBase64([
      ["Dia", "Treino"],
      ["Ter", "reg 6k z2"],
      ["Qui", "8x400 forte"],
    ]);
    const sheets = extractMatrices(base64);
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.sheetName).toBe("Plano");
    expect(sheets[0]!.rows[0]).toEqual(["Dia", "Treino"]);
    expect(sheets[0]!.rows[2]).toEqual(["Qui", "8x400 forte"]);
  });
});
