import { describe, it, expect } from "vitest";
import { buildApp } from "./app.js";

describe("GET /health", () => {
  it("responde ok", async () => {
    const app = buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok", service: "runup-api" });
    await app.close();
  });
});
