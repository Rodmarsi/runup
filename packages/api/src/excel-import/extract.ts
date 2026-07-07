import * as XLSX from "xlsx";

export interface SheetMatrix {
  sheetName: string;
  /** Linhas × colunas como texto bruto (célula vazia = ""). */
  rows: string[][];
}

/**
 * Extração determinística (sem IA): lê o .xlsx (base64) em uma matriz por aba.
 * Barata e previsível — roda antes de qualquer chamada de modelo.
 */
export function extractMatrices(base64: string): SheetMatrix[] {
  const workbook = XLSX.read(base64, { type: "base64" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return { sheetName, rows: [] };
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });
    return {
      sheetName,
      rows: rows.map((r) => r.map((c) => String(c ?? ""))),
    };
  });
}
