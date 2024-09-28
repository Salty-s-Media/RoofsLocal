import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { customerId } = req.body;

    try {
      // Retrieve the customer object
      const customer = await stripe.paymentMethods.list({
        type: "card",
        limit: 1,
        customer: customerId,
      });

      // Detach all payment methods
      if (customer.data !== undefined && Array.isArray(customer.data)) {
        for (const paymentMethod of customer.data) {
          if (paymentMethod && paymentMethod.id) {
            try {
              await stripe.paymentMethods.detach(paymentMethod.id);
            } catch (error) {
              console.error(
                `Error detaching payment method ${paymentMethod.id} for Customer ${customerId}:`,
                error
              );
            }
          }
        }

        res
          .status(200)
          .json({ message: "All payment methods detached successfully" });
      } else {
        res.status(400).json({ error: "Invalid customer data format" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error detaching payment method" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
