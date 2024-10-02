// pages/api/create-checkout-session.ts
import Stripe from "stripe";
import type { NextApiRequest, NextApiResponse } from "next";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  zipCode: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    // Handle any other HTTP method
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  try {
    const { firstName, lastName, email, zipCode }: FormData = req.body;

    // Log customer details
    console.log("Customer Info: ", firstName, lastName, email, zipCode);

    // Create a customer
    const customer = await stripe.customers.create({
      email: `${email}`,
      name: `${firstName} ${lastName}`,
    });

    // Create a Checkout Session in Setup Mode with that Customer ID
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      currency: "usd",
      success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cancel`,
      customer: customer.id,
    });

    return res.status(200).json({ url: session.url, stripeId: customer.id });
  } catch (error) {
    return res.status(500).json({ message: `Internal server error, ${error}` });
  }
}
