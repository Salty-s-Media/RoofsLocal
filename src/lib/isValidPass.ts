export async function isValidPass(password: string, hashedPassword: string) {
  // Logged out chosen password, and manually put hash in .env.
  // Need to be able to set automatically...?
  return (await hashPass(password)) === hashedPassword;
}

async function hashPass(password: string) {
  const arrayBuffer = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(password)
  );

  return Buffer.from(arrayBuffer).toString("base64");
}
