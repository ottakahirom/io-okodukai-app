"use server";

import { hasDatabaseUrl } from "@/lib/db";
import { loadAppStateFromDb, saveAppStateToDb, seedDb } from "@/lib/db-repo";
import { ensureTodaySession } from "@/lib/store";
import type { AppState } from "@/lib/types";

export async function checkDatabaseConfigured(): Promise<boolean> {
  return hasDatabaseUrl();
}

export async function fetchAppStateAction(): Promise<{
  ok: boolean;
  state?: AppState;
  error?: string;
  mode: "neon" | "local";
}> {
  if (!hasDatabaseUrl()) {
    return { ok: false, mode: "local", error: "DATABASE_URL unset" };
  }
  try {
    const loaded = ensureTodaySession(await loadAppStateFromDb());
    await saveAppStateToDb(loaded);
    return { ok: true, mode: "neon", state: loaded };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, mode: "neon", error: message };
  }
}

export async function persistAppStateAction(
  state: AppState,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabaseUrl()) {
    return { ok: false, error: "DATABASE_URL unset" };
  }
  try {
    await saveAppStateToDb(state);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export async function seedDatabaseAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!hasDatabaseUrl()) {
    return { ok: false, error: "DATABASE_URL unset" };
  }
  try {
    await seedDb();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
