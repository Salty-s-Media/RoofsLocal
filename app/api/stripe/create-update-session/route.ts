import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface REQ {
  customerId: string;
}

export async function POST(req: NextRequest, res: NextResponse) {
  if (req.method === "POST") {
    const body = await req.json();
    let { customerId }: REQ = body;

    try {
      // Create a Checkout Session in Setup Mode with the relevant Customer ID.
      const session = await stripe.checkout.sessions.create({
        mode: "setup",
        currency: "usd",
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/dashboard/update?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cancel`,
        customer: customerId,
      });

      return new NextResponse(JSON.stringify({ url: session.url }), {
        status: 200,
      });
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ message: `Internal server error, ${error}` }),
        {
          status: 500,
        }
      );
    }
  }
}
