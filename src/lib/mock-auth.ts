// Mock-up data for testing purpose 
// Swap back to fetch (and delete this file) once the backend is live.

export type Mode = "login" | "signup";

// Pretend these usernames already have accounts (used for Log In).
const MOCK_PLAYERS: Record<string, string> = {
  alice: "secret123",
  bob: "password",
};

// Pretend these usernames are on the pre-test whitelist (allowed to Sign Up).
const MOCK_WHITELIST = ["pory", "hahaha"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AuthResult = { ok: true } | { ok: false; message: string };

export async function mockAuth(
  mode: Mode,
  username: string,
  password: string,
): Promise<AuthResult> {
  await delay(700); // simulate a network round-trip so the loading state is visible

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
      message:
        "Your username is not registered. Please complete the pre-test form first.",
    };
  if (MOCK_PLAYERS[username])
    return {
      ok: false,
      message: "An account already exists for this username. Please log in.",
    };
  return { ok: true };
}