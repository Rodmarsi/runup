import { describe, it, expect } from "vitest";
import { tierForStudentCount, canActivateStudent } from "./subscription.js";

describe("tierForStudentCount", () => {
  it("1–2 alunos → free", () => {
    expect(tierForStudentCount(1)).toBe("free");
    expect(tierForStudentCount(2)).toBe("free");
  });

  it("3–6 alunos → pro", () => {
    expect(tierForStudentCount(3)).toBe("pro");
    expect(tierForStudentCount(6)).toBe("pro");
  });

  it("7+ alunos → elite", () => {
    expect(tierForStudentCount(7)).toBe("elite");
    expect(tierForStudentCount(20)).toBe("elite");
  });
});

describe("canActivateStudent", () => {
  it("free com 2 alunos não pode ativar o 3º", () => {
    expect(canActivateStudent("free", 2)).toBe(false);
  });

  it("free com 1 aluno pode ativar o 2º", () => {
    expect(canActivateStudent("free", 1)).toBe(true);
  });

  it("pro com 6 alunos não pode ativar o 7º", () => {
    expect(canActivateStudent("pro", 6)).toBe(false);
  });

  it("elite não tem limite", () => {
    expect(canActivateStudent("elite", 999)).toBe(true);
  });
});
