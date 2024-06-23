import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  let found = 0;

  if (!req.body) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { sessionId, leadCount } = req.body;

  try {
    // count leads from hubspot according to zip code
    found = leadCount;
    const fullAmount = 25000 * found; // ($250) fixed price in cents * no of leads

    // Retrieve the Session from the success URL, and charge customer;
    const currentSession = await stripe.checkout.sessions.retrieve(sessionId);
    const setupIntentId = currentSession.setup_intent;
    const customerId = currentSession.customer;

    // Retrieve the setup intent to get the payment method ID
    const setupIntent = await stripe.setupIntents.retrieve(
      setupIntentId as string
    );
    const paymentMethodId = setupIntent.payment_method;

    const payment = await stripe.paymentIntents.create({
      customer: customerId as string,
      payment_method: paymentMethodId as string,
      amount: fullAmount,
      currency: "usd",
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders`,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (payment.status === "succeeded") {
      console.log(
        "Leads were found for your area, and you were billed $",
        (fullAmount / 100).toFixed(2)
      );
      res.status(200).json({
        leads: found,
        amount: (fullAmount / 100).toFixed(2),
        customerId: customerId,
      });
    } else {
      console.error("Payment didn't process:", payment.status);
      res.status(204).json({ message: "Returned no results" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Internal server error, ${error}` });
  }
}
