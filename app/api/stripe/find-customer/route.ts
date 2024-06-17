import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface REQ {
  email: string;
}

export async function POST(req: NextRequest) {
  if (req.method === "POST") {
    const body = await req.json();
    let { email }: REQ = body;

    try {
      const customers = await stripe.customers.search({
        query: `email~"${email as string}"`,
        limit: 1,
      });

      return new NextResponse(
        JSON.stringify({
          customerId: customers.data[0]?.id || null,
        }),
        {
          status: 200,
        }
      );
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ message: "Customer not found", error }),
        {
          status: 404,
        }
      );
    }
  }
}
