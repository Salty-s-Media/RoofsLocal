import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  let found = 0;

  const body = await req.json();

  if (!body) {
    throw new Error("Request Failed");
  }

  const { sessionId, leadCount } = body;

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
      return new NextResponse(
        JSON.stringify({
          leads: found,
          amount: (fullAmount / 100).toFixed(2),
          customerId: customerId,
        }),
        {
          status: 200,
        }
      );
    } else {
      console.error("Payment failed:", payment.status);
      return new NextResponse(
        JSON.stringify({ message: `Internal server error, ${payment.status}` }),
        {
          status: 500,
        }
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: `Internal server error, ${error}` }),
      {
        status: 500,
      }
    );
  }
}
