import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import type { CreateShoeInput, UpdateShoeInput } from "./schemas.js";

export class EquipmentService {
  constructor(private readonly db: PrismaClient) {}

  listShoes(studentId: string) {
    return this.db.shoe.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  }

  createShoe(studentId: string, input: CreateShoeInput) {
    return this.db.shoe.create({ data: { studentId, ...input } });
  }

  private async requireOwnShoe(studentId: string, shoeId: string) {
    const shoe = await this.db.shoe.findUnique({ where: { id: shoeId } });
    if (!shoe || shoe.studentId !== studentId) throw errors.shoeNotFound();
    return shoe;
  }

  async updateShoe(studentId: string, shoeId: string, input: UpdateShoeInput) {
    await this.requireOwnShoe(studentId, shoeId);
    const { retired, ...rest } = input;
    return this.db.shoe.update({
      where: { id: shoeId },
      data: {
        ...rest,
        retiredAt: retired === undefined ? undefined : retired ? new Date() : null,
      },
    });
  }

  async deleteShoe(studentId: string, shoeId: string) {
    await this.requireOwnShoe(studentId, shoeId);
    await this.db.shoe.delete({ where: { id: shoeId } });
  }
}
