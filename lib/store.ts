import fs from "fs";
import path from "path";

/**
 * Opslaglaag: gebruikt Vercel KV wanneer de omgeving geconfigureerd is
 * (KV_REST_API_URL + KV_REST_API_TOKEN), anders een lokaal JSON-bestand
 * zodat de app ook zonder KV lokaal draait.
 */

const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const LOCAL_DB = path.join(process.cwd(), ".data", "db.json");

function readLocal(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB, "utf8"));
  } catch {
    return {};
  }
}

function writeLocal(db: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(LOCAL_DB), { recursive: true });
  fs.writeFileSync(LOCAL_DB, JSON.stringify(db, null, 2));
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (hasKV) {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<T>(key)) ?? null;
  }
  const db = readLocal();
  return (db[key] as T) ?? null;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (hasKV) {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value);
    return;
  }
  const db = readLocal();
  db[key] = value;
  writeLocal(db);
}

export async function kvDel(key: string): Promise<void> {
  if (hasKV) {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
    return;
  }
  const db = readLocal();
  delete db[key];
  writeLocal(db);
}
