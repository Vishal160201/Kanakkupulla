import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { readPreferences, type MoneyPreferences } from "../preferences";

export async function getPreferences(userId: string): Promise<MoneyPreferences> {
  const row = await prisma.moneyPreference.findUnique({ where: { userId } });
  return readPreferences(row?.data);
}

export async function savePreferences(userId: string, prefs: MoneyPreferences): Promise<MoneyPreferences> {
  const data = prefs as unknown as Prisma.InputJsonValue;
  await prisma.moneyPreference.upsert({ where: { userId }, create: { userId, data }, update: { data } });
  return prefs;
}

export async function addDismissed(userId: string, key: string): Promise<void> {
  const prefs = await getPreferences(userId);
  if (prefs.dismissed.includes(key)) return;
  await savePreferences(userId, { ...prefs, dismissed: [...prefs.dismissed, key].slice(-2000) });
}
