import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { validateEmailFormat, validatePhoneNumber } from "@/utils/utils";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  zipCode: string;
  phone: string;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  const body = await req.json();
  let { firstName, lastName, email, zipCode, phone }: FormData = body;

  const trimmedPhone = phone.trim();

  if (!trimmedPhone.startsWith("+1") || trimmedPhone.startsWith("+1")) {
    // Append "+1 " only if it's not already there
    const cleanedPhone = "+1 " + trimmedPhone;
    phone = cleanedPhone;
  } else {
    phone = trimmedPhone;
  }

  const isPhoneValid = validatePhoneNumber(phone);
  const isEmailValid = validateEmailFormat(email);

  if (!isEmailValid || !isPhoneValid) {
    console.error("Invalid email or phone format");
    return NextResponse.json({ error: "Bad Validation" }, { status: 500 });
  }

  if (isPhoneValid && isEmailValid) {
    console.log(
      "Contractor Info: ",
      firstName,
      lastName,
      email,
      zipCode,
      phone
    );

    try {
      // Create a customer
      const customer = await stripe.customers.create({
        email: email,
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

      //Testing only
      console.log(session);

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
