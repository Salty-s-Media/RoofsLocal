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
        from: "+17543003917",
        to: "+16503028079", // +16503028079 rc // +15005550006
        url: "http://demo.twilio.com/docs/voice.xml",
        machineDetection: "DetectMessageEnd",
      });
    } catch (error) {
      console.error("Failed to create call:", error);
      return res.status(500).json({ message: "Failed to create call" });
    }
    console.log(call);
    return res.status(200).json({ message: call });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
