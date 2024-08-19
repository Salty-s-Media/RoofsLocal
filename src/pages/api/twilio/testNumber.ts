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

    let call: any = {};

    try {
      call = await client.calls.create({
        from: "+19025415178",
        to: "+17543003917",
        url: "http://demo.twilio.com/docs/voice.xml",
      });
    } catch (error) {
      console.error("Failed to create call:", error);
      return res.status(500).json({ message: "Failed to create call" });
    }

    return res.status(200).json({ message: call });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
