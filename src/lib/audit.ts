import { db } from "./db";
import { auditLog } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { isSolanaEnabled, anchorHashToSolana } from "./solana";

// Create SHA-256 hash
function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Get the last audit log entry to maintain hash chain
async function getLastEntry() {
  const entries = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  return entries[0] || null;
}

// Log an action with hash chain
export async function logAction(
  actionType: "qa" | "report",
  payload: Record<string, unknown>
): Promise<string> {
  const id = uuidv4();
  // SQLite `integer timestamp` columns store Unix seconds. Round to seconds so
  // the value used in the hash survives a round-trip through the database and
  // `verifyHashChain` recomputes the same digest.
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const timestamp = new Date(timestampSeconds * 1000);

  // Get previous hash for chain
  const lastEntry = await getLastEntry();
  const prevHash = lastEntry?.hash || "genesis";

  // Create hash of this entry
  const hashData = JSON.stringify({
    prevHash,
    actionType,
    payload,
    timestamp: timestampSeconds,
  });
  const hash = sha256(hashData);

  // Insert into database
  await db.insert(auditLog).values({
    id,
    actionType,
    payload: JSON.stringify(payload),
    prevHash,
    hash,
    createdAt: timestamp,
  });

  // Auto-anchor to Solana if enabled (non-blocking)
  if (isSolanaEnabled()) {
    anchorHashToSolana(hash)
      .then((result) => {
        if (result.success && result.signature) {
          updateWithSolanaTx(id, result.signature).catch(console.error);
        }
      })
      .catch(console.error);
  }

  return hash;
}

// Verify the hash chain integrity
export async function verifyHashChain(): Promise<{
  valid: boolean;
  brokenAt?: string;
  totalEntries: number;
}> {
  const entries = await db
    .select()
    .from(auditLog)
    .orderBy(auditLog.createdAt);

  if (entries.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? "genesis" : entries[i - 1].hash;

    if (entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        brokenAt: entry.id,
        totalEntries: entries.length,
      };
    }

    // Verify the hash itself. Timestamp is stored as Unix seconds in SQLite,
    // so the hash must be recomputed with the same seconds-precision value.
    const hashData = JSON.stringify({
      prevHash: entry.prevHash,
      actionType: entry.actionType,
      payload: JSON.parse(entry.payload),
      timestamp: Math.floor(entry.createdAt.getTime() / 1000),
    });
    const expectedHash = sha256(hashData);

    if (entry.hash !== expectedHash) {
      return {
        valid: false,
        brokenAt: entry.id,
        totalEntries: entries.length,
      };
    }
  }

  return { valid: true, totalEntries: entries.length };
}

// Get audit log entries
export async function getAuditLog(limit: number = 100) {
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

// Update an entry with Solana transaction signature
export async function updateWithSolanaTx(
  entryId: string,
  txSignature: string
) {
  await db
    .update(auditLog)
    .set({ solanaTxSignature: txSignature })
    .where(eq(auditLog.id, entryId));
}
