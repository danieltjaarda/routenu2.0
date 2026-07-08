const COOKIE_NAME = "routenu_auth";

export { COOKIE_NAME };

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "DanielXd12";
}

/** SHA-256 hash van het wachtwoord; dit is de waarde die in de cookie staat. */
export async function authToken(): Promise<string> {
  const data = new TextEncoder().encode(`routenu:${adminPassword()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
