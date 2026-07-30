import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY?.trim() || env.serviceRoleKey;
  if (!secret) throw new Error("AI_ENCRYPTION_KEY atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  return createHash("sha256").update(secret).digest();
}

export function encryptAICredential(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("API key tidak boleh kosong.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAICredential(envelope: string): string {
  const [version, ivValue, tagValue, encryptedValue] = envelope.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Format credential AI tidak valid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
