import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { CallSid, CallStatus, From, To } = req.body;
    console.log('body:');
    console.log(req.body);

    console.log(`Call SID: ${CallSid}`);
    console.log(`Call Status: ${CallStatus}`);
    console.log(`From: ${From}`);
    console.log(`To: ${To}`);

    // You can also store the data in a database or perform other actions here

    return res.status(200).json({ message: "Call status received" });
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
