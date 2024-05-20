"use server";

import db from "@/frontend/db/db";

export async function userOrderExists(email: string, productId: string) {
  return (
    (await db.orders.findFirst({
      where: { user: { email }, productId },
      select: { id: true },
    })) != null
  );
}
