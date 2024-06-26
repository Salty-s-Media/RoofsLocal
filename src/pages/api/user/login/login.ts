import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, password } = req.body;

  const user = { email, password };

  try {
    // Compare the session ID to local storage and the db

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login Error: ", error);
    res.status(500).json({ message: "Login failed" });
  }
}
