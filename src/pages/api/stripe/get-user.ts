import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface REQ {
  customerId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const { customerId }: REQ = req.body;
    try {
      const customer = await stripe.customers.retrieve(`${customerId}`);

      return res.status(200).json({ message: "Customer retrieved", customer });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Internal server error, ${error}` });
    }
  } else {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
