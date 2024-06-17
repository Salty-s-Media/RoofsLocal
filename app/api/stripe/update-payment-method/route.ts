import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface REQ {
  sessionId: string;
  customerId: string;
}

export async function POST(req: NextRequest) {
  if (req.method === "POST") {
    const body = await req.json();
    const { sessionId, customerId }: REQ = body;

    try {
      if (!sessionId || !customerId) {
        return NextResponse.json(
          { error: "Missing Required" },
          { status: 400 }
        );
      }

      const currentSession = await stripe.checkout.sessions.retrieve(sessionId);
      const setupIntentId = currentSession.setup_intent;

      // Retrieve the setup intent to get the payment method ID
      const setupIntent = await stripe.setupIntents.retrieve(
        setupIntentId as string
      );
      const paymentMethodId = setupIntent.payment_method;

      // Update the customer's source invoice settings to the new payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId as string,
        },
      });

      return NextResponse.json(
        { message: "Payment source updated successfully." },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating customer source:", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }
}
