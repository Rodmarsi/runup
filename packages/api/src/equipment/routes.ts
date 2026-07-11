import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { EquipmentService } from "./service.js";
import { createShoeSchema, updateShoeSchema } from "./schemas.js";

export function equipmentRoutes(db: PrismaClient) {
  const equipment = new EquipmentService(db);
  const asStudent = { preHandler: requireRole("student") };

  return async function (app: FastifyInstance) {
    app.get("/me/shoes", asStudent, async (request) => {
      return equipment.listShoes(request.authUser!.id);
    });

    app.post("/me/shoes", asStudent, async (request, reply) => {
      const parsed = createShoeSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const shoe = await equipment.createShoe(request.authUser!.id, parsed.data);
      reply.status(201).send(shoe);
    });

    app.patch("/me/shoes/:id", asStudent, async (request) => {
      const { id } = request.params as { id: string };
      const parsed = updateShoeSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return equipment.updateShoe(request.authUser!.id, id, parsed.data);
    });

    app.delete("/me/shoes/:id", asStudent, async (request, reply) => {
      const { id } = request.params as { id: string };
      await equipment.deleteShoe(request.authUser!.id, id);
      reply.status(204).send();
    });
  };
}
