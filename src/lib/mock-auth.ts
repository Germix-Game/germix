// Mock-up data for testing purpose
// Swap back to real fetch (and delete this file) once the backend is live.

export type Mode = "login" | "signup";

// Pretend these usernames already have accounts (used for Log In).
const MOCK_PLAYERS: Record<string, string> = {
  hello: "123456",
  hi: "654321",
};

// Pre-test whitelist (allowed to Sign Up).
// `BukayoSaka` is whitelisted but has NO account yet → use it to test a successful sign-up.
const MOCK_WHITELIST = ["hello", "hi", "BukayoSaka"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AuthResult = { ok: true } | { ok: false; message: string };

// STEP 1 (username page): existence / whitelist / duplicate checks — no password yet.
export async function mockCheckUsername(
  mode: Mode,
  username: string,
): Promise<AuthResult> {
  await delay(500);

  if (mode === "login") {
    if (!MOCK_PLAYERS[username]) return { ok: false, message: "Username not found." };
    return { ok: true };
  }

  // signup
  if (!MOCK_WHITELIST.includes(username))
    return {
      ok: false,
      message: "Your username is not registered. Please complete the pre-test form first.",
    };
  if (MOCK_PLAYERS[username])
    return {
      ok: false,
      message: "An account already exists for this username. Please log in.",
    };
  return { ok: true };
}

// STEP 2 (password page): the actual login / sign-up.
export async function mockAuth(
  mode: Mode,
  username: string,
  password: string,
): Promise<AuthResult> {
  await delay(700);

  if (mode === "login") {
    const realPassword = MOCK_PLAYERS[username];
    if (!realPassword) return { ok: false, message: "Username not found." };
    if (realPassword !== password)
      return { ok: false, message: "Incorrect password. Please try again." };
    return { ok: true };
  }

  // signup
  if (!MOCK_WHITELIST.includes(username))
    return {
      ok: false,
      message: "Your username is not registered. Please complete the pre-test form first.",
    };
  if (MOCK_PLAYERS[username])
    return {
      ok: false,
      message: "An account already exists for this username. Please log in.",
    };
  return { ok: true };
}