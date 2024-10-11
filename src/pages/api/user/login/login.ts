import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcrypt";
import crypto from "crypto";
import { serialize } from "cookie";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, _password } = req.body;

  console.log("Backend Login Data: ", email, _password);

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { email },
    });

    if (!contractor) {
      return res.status(401).json({ error: "No Logins Exist." });
    }

    // const isMatch = await bcrypt.compare(
    //   _password as string,
    //   contractor.password
    // );
    const isMatch = _password === contractor.password;

    console.log("Match: ", isMatch);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    const sessionId = crypto.randomBytes(16).toString("hex");
    // const hashedSessionId = await bcrypt.hash(sessionId, 10);

    await prisma.contractor.update({
      where: { email },
      data: { sessionId: sessionId },
    });

    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      path: "/",
      sameSite: "strict" as "strict" | "lax" | "none",
      secure: process.env.NODE_ENV === "production",
    };
    const cookie = serialize("sessionId", sessionId, cookieOptions);
    res.setHeader("Set-Cookie", cookie);

    const { password, ...rest } = contractor;
    res.status(200).json(rest);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
