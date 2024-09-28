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
  if (req.method === "DELETE") {
    const { customerId }: REQ = req.body;
    try {
      // Delete the customer by ID
      const deleted = await stripe.customers.del(`${customerId}`);

      return res.status(200).json({ success: deleted.deleted });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Internal server error, ${error}` });
    }
  } else {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
