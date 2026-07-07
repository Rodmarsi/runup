import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./passwords.js";

describe("passwords", () => {
  it("verifica a senha correta", async () => {
    const hash = await hashPassword("segredo123");
    expect(await verifyPassword("segredo123", hash)).toBe(true);
  });

  it("rejeita a senha errada", async () => {
    const hash = await hashPassword("segredo123");
    expect(await verifyPassword("outra", hash)).toBe(false);
  });

  it("o hash não é a senha em texto puro", async () => {
    const hash = await hashPassword("segredo123");
    expect(hash).not.toContain("segredo123");
  });
});
