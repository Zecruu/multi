import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import SyncSettings from "@/models/SyncSettings";

/**
 * Resolve the current sync key.
 *
 * Priority:
 *   1. Mongo (admin UI owns key rotation here)
 *   2. process.env.SYNC_AGENT_KEY (one-time bootstrap / legacy fallback)
 *
 * Returns null if nothing is configured anywhere.
 */
export async function getSyncKey(): Promise<string | null> {
  await connectDB();
  const doc = await SyncSettings.findOne().lean();
  if (doc?.syncKey) return doc.syncKey;
  return process.env.SYNC_AGENT_KEY || null;
}

export async function setSyncKey(
  key: string,
  rotatedBy: string
): Promise<void> {
  await connectDB();
  const existing = await SyncSettings.findOne();
  if (existing) {
    existing.syncKey = key;
    existing.rotatedBy = rotatedBy;
    existing.rotatedAt = new Date();
    await existing.save();
  } else {
    await SyncSettings.create({
      syncKey: key,
      rotatedBy,
      rotatedAt: new Date(),
    });
  }
}

export function generateSyncKey(): string {
  return `mse_${crypto.randomBytes(32).toString("hex")}`;
}

/** Timing-safe comparison. Returns false for null/empty inputs. */
export async function verifySyncKey(provided: string | null): Promise<boolean> {
  if (!provided) return false;
  const expected = await getSyncKey();
  if (!expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
