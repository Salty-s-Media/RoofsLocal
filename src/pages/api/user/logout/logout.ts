import { NextApiRequest, NextApiResponse } from "next";
import { cookies } from "next/headers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Destroy the session
  cookies().set("session", "", { expires: new Date(0) });

  res.status(200).json({ message: "Logout successful" });
}
