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
  if (req.method === "POST") {
    const { customerId }: REQ = req.body;
    try {
      // Create a Checkout Session in Setup Mode with the relevant Customer ID.
      const session = await stripe.checkout.sessions.create({
        mode: "setup",
        currency: "usd",
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cancel`,
        customer: customerId,
      });

      return res.status(200).json({ url: session.url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `Internal server error, ${error}` });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
