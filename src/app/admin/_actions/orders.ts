"use server";

import db from "@/db/db";
import { notFound } from "next/navigation";

export async function deleteOrder(id: string) {
  const order = await db.orders.delete({
    where: { id },
  });

  if (order == null) return notFound();

  return order;
}
