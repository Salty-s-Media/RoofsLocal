import { NextApiRequest, NextApiResponse } from "next";
import { encrypt } from "../../../../../utils/lib";
import { cookies } from "next/headers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, password } = req.body;

  const user = { email, password };

  try {
    // Create the session
    const expires = new Date(Date.now() + 10 * 1000);
    const session = await encrypt({ user, expires });

    // Save the session in a cookie
    cookies().set("session", session, { expires, httpOnly: true });

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login Error: ", error);
    res.status(500).json({ message: "Login failed" });
  }
}
