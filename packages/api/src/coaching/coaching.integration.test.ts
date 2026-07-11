import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@runup/db";
import { buildApp } from "../app.js";
import { resetDb } from "../testing/reset-db.js";

const app = buildApp({ logger: false });

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await app.close();
  await prisma.$disconnect();
});

async function registerUser(
  role: "student" | "coach",
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: `${role} ${email}`, email, password: "segredo123", role },
  });
  return res.json().accessToken as string;
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function invite(coachToken: string, studentEmail: string) {
  return app.inject({
    method: "POST",
    url: "/coach/students/invite",
    headers: auth(coachToken),
    payload: { studentEmail },
  });
}

async function firstInviteId(studentToken: string): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: "/student/invites",
    headers: auth(studentToken),
  });
  return res.json()[0].id as string;
}

describe("convite → aceite", () => {
  it("treinador convida e aluno aceita, virando vínculo ativo", async () => {
    const coach = await registerUser("coach", "coach1@runup.app");
    const student = await registerUser("student", "aluno1@runup.app");

    const inv = await invite(coach, "aluno1@runup.app");
    expect(inv.statusCode).toBe(201);
    expect(inv.json().status).toBe("pending");

    const id = await firstInviteId(student);
    const acc = await app.inject({
      method: "POST",
      url: `/student/invites/${id}/accept`,
      headers: auth(student),
    });
    expect(acc.statusCode).toBe(200);
    expect(acc.json().status).toBe("active");
  });

  it("convidar email inexistente retorna 404", async () => {
    const coach = await registerUser("coach", "coach2@runup.app");
    const res = await invite(coach, "ninguem@runup.app");
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("STUDENT_NOT_FOUND");
  });

  it("vínculo duplicado retorna 409", async () => {
    const coach = await registerUser("coach", "coach3@runup.app");
    await registerUser("student", "aluno3@runup.app");
    await invite(coach, "aluno3@runup.app");
    const dup = await invite(coach, "aluno3@runup.app");
    expect(dup.statusCode).toBe(409);
    expect(dup.json().code).toBe("ALREADY_LINKED");
  });
});

describe("aluno convida treinador → treinador aceita", () => {
  it("aluno convida por email e o treinador aceita, virando vínculo ativo", async () => {
    const coach = await registerUser("coach", "coach-rev1@runup.app");
    const student = await registerUser("student", "aluno-rev1@runup.app");

    const inv = await app.inject({
      method: "POST",
      url: "/student/invite-coach",
      headers: auth(student),
      payload: { coachEmail: "coach-rev1@runup.app" },
    });
    expect(inv.statusCode).toBe(201);
    expect(inv.json()).toMatchObject({ status: "pending", initiatedBy: "student" });

    // Não deve aparecer nos convites que o ALUNO precisa responder (foi ele quem iniciou).
    const studentInvites = await app.inject({
      method: "GET",
      url: "/student/invites",
      headers: auth(student),
    });
    expect(studentInvites.json()).toHaveLength(0);

    const coachInvites = await app.inject({
      method: "GET",
      url: "/coach/invites",
      headers: auth(coach),
    });
    expect(coachInvites.json()).toHaveLength(1);
    const linkId = coachInvites.json()[0].id;

    const acc = await app.inject({
      method: "POST",
      url: `/coach/invites/${linkId}/accept`,
      headers: auth(coach),
    });
    expect(acc.statusCode).toBe(200);
    expect(acc.json().status).toBe("active");
  });

  it("convidar treinador com email inexistente retorna 404", async () => {
    const student = await registerUser("student", "aluno-rev2@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/student/invite-coach",
      headers: auth(student),
      payload: { coachEmail: "ninguem@runup.app" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("COACH_NOT_FOUND");
  });

  it("treinador recusa o convite do aluno → vínculo vira ended", async () => {
    const coach = await registerUser("coach", "coach-rev3@runup.app");
    const student = await registerUser("student", "aluno-rev3@runup.app");
    await app.inject({
      method: "POST",
      url: "/student/invite-coach",
      headers: auth(student),
      payload: { coachEmail: "coach-rev3@runup.app" },
    });
    const linkId = (
      await app.inject({ method: "GET", url: "/coach/invites", headers: auth(coach) })
    ).json()[0].id;

    const dec = await app.inject({
      method: "POST",
      url: `/coach/invites/${linkId}/decline`,
      headers: auth(coach),
    });
    expect(dec.json().status).toBe("ended");
  });

  it("aluno não pode aceitar o próprio convite enviado ao treinador (404)", async () => {
    const coach = await registerUser("coach", "coach-rev4@runup.app");
    const student = await registerUser("student", "aluno-rev4@runup.app");
    await app.inject({
      method: "POST",
      url: "/student/invite-coach",
      headers: auth(student),
      payload: { coachEmail: "coach-rev4@runup.app" },
    });
    const linkId = (
      await app.inject({ method: "GET", url: "/coach/invites", headers: auth(coach) })
    ).json()[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/student/invites/${linkId}/accept`,
      headers: auth(student),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("autorização por papel", () => {
  it("aluno não pode convidar (403)", async () => {
    const student = await registerUser("student", "aluno4@runup.app");
    const res = await app.inject({
      method: "POST",
      url: "/coach/students/invite",
      headers: auth(student),
      payload: { studentEmail: "x@runup.app" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("treinador não acessa rotas de aluno (403)", async () => {
    const coach = await registerUser("coach", "coach5@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/student/invites",
      headers: auth(coach),
    });
    expect(res.statusCode).toBe(403);
  });

  it("aluno não aceita convite de outro aluno (404)", async () => {
    const coach = await registerUser("coach", "coach6@runup.app");
    await registerUser("student", "alvo@runup.app");
    const intruso = await registerUser("student", "intruso@runup.app");
    await invite(coach, "alvo@runup.app");

    // pega o id do convite do alvo direto no banco
    const link = await prisma.coachStudent.findFirst();
    const res = await app.inject({
      method: "POST",
      url: `/student/invites/${link!.id}/accept`,
      headers: auth(intruso),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("visão do aluno pelo treinador", () => {
  async function linkPair(suffix: string) {
    const coach = await registerUser("coach", `coach-${suffix}@runup.app`);
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Aluno",
        email: `aluno-${suffix}@runup.app`,
        password: "segredo123",
        role: "student",
      },
    });
    const student = reg.json();
    await invite(coach, `aluno-${suffix}@runup.app`);
    const id = await firstInviteId(student.accessToken);
    await app.inject({
      method: "POST",
      url: `/student/invites/${id}/accept`,
      headers: auth(student.accessToken),
    });
    return { coach, studentId: student.user.id as string };
  }

  it("treinador vê o overview do aluno vinculado", async () => {
    const { coach, studentId } = await linkPair("ov1");
    const res = await app.inject({
      method: "GET",
      url: `/coach/students/${studentId}/overview`,
      headers: auth(coach),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().student.id).toBe(studentId);
    expect(res.json()).toHaveProperty("stats");
    expect(res.json()).toHaveProperty("goals");
  });

  it("não vê aluno sem vínculo (403)", async () => {
    const coach = await registerUser("coach", "coach-ov2@runup.app");
    const other = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Outro",
        email: "outro-ov2@runup.app",
        password: "segredo123",
        role: "student",
      },
    });
    const res = await app.inject({
      method: "GET",
      url: `/coach/students/${other.json().user.id}/overview`,
      headers: auth(coach),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("faixa de assinatura (enforcement no aceite)", () => {
  it("free bloqueia o 3º aluno; upgrade para pro libera", async () => {
    const coach = await registerUser("coach", "coachlim@runup.app");
    for (const n of [1, 2, 3]) {
      await registerUser("student", `s${n}@runup.app`);
    }

    // Ativa os 2 primeiros (dentro do free).
    for (const n of [1, 2]) {
      await invite(coach, `s${n}@runup.app`);
    }
    for (const email of ["s1@runup.app", "s2@runup.app"]) {
      const token = (
        await app.inject({
          method: "POST",
          url: "/auth/login",
          payload: { email, password: "segredo123" },
        })
      ).json().accessToken;
      const id = await firstInviteId(token);
      const acc = await app.inject({
        method: "POST",
        url: `/student/invites/${id}/accept`,
        headers: auth(token),
      });
      expect(acc.statusCode).toBe(200);
    }

    // 3º aluno: convite ok, mas aceite bloqueado no free.
    await invite(coach, "s3@runup.app");
    const s3 = (
      await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "s3@runup.app", password: "segredo123" },
      })
    ).json().accessToken;
    const id3 = await firstInviteId(s3);
    const blocked = await app.inject({
      method: "POST",
      url: `/student/invites/${id3}/accept`,
      headers: auth(s3),
    });
    expect(blocked.statusCode).toBe(402);
    expect(blocked.json().code).toBe("COACH_LIMIT_REACHED");

    // Treinador faz upgrade para pro → aceite passa.
    await app.inject({
      method: "POST",
      url: "/coach/subscription/upgrade",
      headers: auth(coach),
      payload: { tier: "pro" },
    });
    const ok = await app.inject({
      method: "POST",
      url: `/student/invites/${id3}/accept`,
      headers: auth(s3),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().status).toBe("active");
  });

  it("subscription view reflete tier e contagem", async () => {
    const coach = await registerUser("coach", "coachview@runup.app");
    const res = await app.inject({
      method: "GET",
      url: "/coach/subscription",
      headers: auth(coach),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      tier: "free",
      maxStudents: 2,
      activeStudents: 0,
      canActivateMore: true,
    });
  });
});
