import { readFileSync } from "node:fs";

function readEnvFile(path) {
  try {
    return Object.fromEntries(readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      }));
  } catch {
    return {};
  }
}

const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
const baseUrl = env.AI_BASE_URL?.replace(/\/$/, "");
const model = env.AI_MODEL;

if (!baseUrl || !model) {
  console.error("AI_BASE_URL dan AI_MODEL harus diisi di .env atau .env.local.");
  process.exit(1);
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    message: { type: "string", maxLength: 120 },
  },
};

const controller = new AbortController();
const timeoutMs = Math.min(Number(env.AI_TIMEOUT_MS) || 20_000, 20_000);
const timeout = setTimeout(() => controller.abort(), timeoutMs);
const startedAt = Date.now();

async function request(mode) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.AI_API_KEY ? { Authorization: `Bearer ${env.AI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: mode === "json_object"
            ? `Keluarkan hanya JSON valid sesuai schema: ${JSON.stringify(schema)}`
            : "Keluarkan hanya JSON valid sesuai schema.",
        },
        { role: "user", content: "Konfirmasi AI Coach KITMOTION aktif dalam bahasa Indonesia." },
      ],
      response_format: mode === "json_object"
        ? { type: "json_object" }
        : { type: "json_schema", json_schema: { name: "kitmotion_health", strict: true, schema } },
    }),
    signal: controller.signal,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

try {
  let mode = env.AI_RESPONSE_FORMAT === "json_object" ? "json_object" : "json_schema";
  let result = await request(mode);
  const errorMessage = result.payload?.error?.message?.toLowerCase() ?? "";
  if (result.response.status === 400 && (errorMessage.includes("response_format") || errorMessage.includes("json_schema") || errorMessage.includes("unavailable"))) {
    mode = "json_object";
    result = await request(mode);
  }

  const rawContent = result.payload?.choices?.[0]?.message?.content ?? "";
  const content = rawContent.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(content);
  const valid = result.response.ok && parsed?.status === "ok" && typeof parsed?.message === "string";

  console.log(`Provider : ${env.AI_PROVIDER || "openai-compatible"}`);
  console.log(`Endpoint : ${new URL(baseUrl).host}`);
  console.log(`Model    : ${result.payload?.model || model}`);
  console.log(`Mode     : ${mode}`);
  console.log(`Status   : ${valid ? "AKTIF" : "TIDAK VALID"} (HTTP ${result.response.status}, ${Date.now() - startedAt}ms)`);
  if (!valid) process.exitCode = 1;
} catch (error) {
  const reason = error instanceof Error && error.name === "AbortError" ? "request timeout" : error instanceof Error ? error.message : "unknown error";
  console.error(`Status   : GAGAL (${reason})`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
