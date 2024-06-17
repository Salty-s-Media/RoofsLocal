import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function DELETE(req: NextRequest) {
  if (req.method === "DELETE") {
    try {
      const body = await req.json();
      let { customerId } = body;

      // Delete the customer
      await stripe.customers.del(customerId);

      return new NextResponse(
        JSON.stringify({ message: "Customer deleted successfully." }),
        {
          status: 200,
        }
      );
    } catch (error) {
      console.error("Error deleting customer:", error);
      return new NextResponse(
        JSON.stringify({ error: "Failed to delete customer" }),
        {
          status: 500,
        }
      );
    }
  } else {
    return new NextResponse(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
    });
  }
}
