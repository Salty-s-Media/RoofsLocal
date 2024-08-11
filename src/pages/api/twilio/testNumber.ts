import twilio from "twilio";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const call = await client.calls.create({
        from: "+987654321",
        to: "+123456789",
        url: "http://demo.twilio.com/docs/voice.xml",
      });

      return res.status(200).json({ message: call });
    } catch (error) {
      console.error("Failed to create call:", error);
      alert("Failed to create call.");
    }

    return res.status(200).json({ message: "gg" });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
