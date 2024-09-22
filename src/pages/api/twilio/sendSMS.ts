import { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let sms: any = {};

  try {
    sms = await client.messages.create({
      from: "+17543003917",
      to: "+16505555555", // +16503028079 rc // +15005550006
      body: "Hello from Twilio!",
    });
  } catch (error) {
    console.error("Failed to create SMS:", error);
    return res.status(500).json({ message: "Failed to create SMS" });
  }

  console.log(sms);
  return res.status(200).json({ message: sms });
}
