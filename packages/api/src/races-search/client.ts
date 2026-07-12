import * as cheerio from "cheerio";

const BASE = "https://www.corridasbr.com.br";

export interface CorridasBrListItem {
  externalId: string;
  name: string;
  city: string;
  state: string;
  raceDate: string;
  distancesLabel: string;
  longestDistanceMeters: number | null;
}

export interface CorridasBrDetail {
  externalId: string;
  name: string;
  city: string | null;
  state: string;
  raceDate: string | null;
  startLocation: string | null;
  distancesLabel: string | null;
  organizer: string | null;
  registrationUrl: string | null;
  regulationUrl: string | null;
}

/** Isola o acesso ao site pra permitir um cliente falso nos testes. */
export interface RaceSearchClient {
  searchByState(state: string): Promise<CorridasBrListItem[]>;
  getDetail(state: string, externalId: string): Promise<CorridasBrDetail>;
}

async function fetchLatin1(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RunUpBot/1.0; +https://runup-web.onrender.com)" },
  });
  if (!res.ok) throw new Error(`corridasbr respondeu ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // O site publica em ISO-8859-1 (ver <meta charset>) — decodificar como
  // UTF-8 bagunçaria os acentos.
  return buf.toString("latin1");
}

/** "4km" → 4000; "21/12/6km" → maior valor (21000, a distância principal do dia). */
export function parseLongestDistanceMeters(label: string): number | null {
  const nums = [...label.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) =>
    parseFloat((m[1] ?? "0").replace(",", ".")),
  );
  if (nums.length === 0) return null;
  return Math.round(Math.max(...nums) * 1000);
}

function extractField($: cheerio.CheerioAPI, label: string): string | null {
  let value: string | null = null;
  $("tr").each((_, tr) => {
    const tds = $(tr).find("> td");
    if (tds.length < 2) return;
    const labelText = $(tds[0]).find("span.tipo4").first().text().trim();
    if (labelText === label) {
      value = $(tds[1]).find("span.tipo4").first().text().trim() || null;
    }
  });
  return value;
}

/**
 * Cliente somente-leitura do corridasbr.com.br (site público de calendário de
 * corridas). Sem API oficial — faz parsing das páginas HTML públicas de
 * calendário por estado e de detalhe da prova.
 */
export class CorridasBrClient implements RaceSearchClient {
  async searchByState(state: string): Promise<CorridasBrListItem[]> {
    const html = await fetchLatin1(`${BASE}/${state}/calendario.asp`);
    const $ = cheerio.load(html);
    const items: CorridasBrListItem[] = [];

    const now = new Date();
    let year = now.getFullYear();
    let lastMonthSeen = -1;

    $("table[border='1'] tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const dateText = $(cells[0]).text().trim();
      const dateMatch = dateText.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (!dateMatch) return;

      const day = Number(dateMatch[1]);
      const rowMonth = Number(dateMatch[2]);
      // A listagem começa no mês atual e segue em ordem — se o mês "voltar"
      // (ex.: de dezembro pra janeiro), viramos o ano.
      if (lastMonthSeen !== -1 && rowMonth < lastMonthSeen) year += 1;
      lastMonthSeen = rowMonth;

      const city = $(cells[1]).find("a").text().trim() || $(cells[1]).text().trim();

      const nameLink = $(cells[2]).find("a");
      const href = nameLink.attr("href") ?? "";
      const idMatch = href.match(/escolha=(\d+)/);
      const externalId = idMatch?.[1];
      if (!externalId) return;

      const distancesLabel = $(cells[3]).text().trim();

      items.push({
        externalId,
        name: nameLink.text().trim(),
        city,
        state,
        raceDate: `${year}-${String(rowMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        distancesLabel,
        longestDistanceMeters: parseLongestDistanceMeters(distancesLabel),
      });
    });

    return items;
  }

  async getDetail(state: string, externalId: string): Promise<CorridasBrDetail> {
    const html = await fetchLatin1(
      `${BASE}/${state}/mostracorrida.asp?escolha=${externalId}`,
    );
    const $ = cheerio.load(html);

    const name = $("span.tipo7").first().text().trim();
    const dateText = extractField($, "Data:");
    const [d, m, y] = (dateText ?? "").split("/");
    const raceDate = d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : null;

    const scriptText = $("script")
      .map((_, el) => $(el).html() ?? "")
      .get()
      .join("\n");
    const regMatch = scriptText.match(
      /function\s+para(?:onde|insc)\s*\(\)\s*\{\s*window\.open\('([^']+)'\)/,
    );
    const regulationMatch = scriptText.match(
      /function\s+parareg\s*\(\)\s*\{\s*window\.location\.replace\('([^']+)'\)/,
    );

    return {
      externalId,
      name,
      city: extractField($, "Cidade:"),
      state,
      raceDate,
      startLocation: extractField($, "Largada:"),
      distancesLabel: extractField($, "Distância(s):"),
      organizer: extractField($, "Organizador:"),
      registrationUrl: regMatch?.[1] ?? null,
      regulationUrl: regulationMatch?.[1] ?? null,
    };
  }
}
