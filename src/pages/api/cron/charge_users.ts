import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { Parser } from 'json2csv';
import Stripe from "stripe";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);
const json2csvParser = new Parser();
const PRICE_PER_LEAD = parseFloat(process.env.PRICE_PER_LEAD || "1");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface Contact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
  };
}

interface HSLead {
  id: string;
  properties: {
    hs_lead_status: string;
  };
}

function sendEmail(email: string, leads: Contact[]) {
  if (leads.length === 0) return;
  resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: [email],
    subject: 'Leads',
    text: `Attached are your leads ${leads.length}. Your card on file will be charged ${leads.length * PRICE_PER_LEAD} USD.`,
    attachments: [
      {
        filename: 'leads.csv',
        content: Buffer.from(json2csvParser.parse(leads)).toString('base64')
      },
    ]
  });
}

async function chargeContractor(stripeId: string, amount: number) {
  // Retrieve the Session from the success URL, and charge customer;
  const currentSession = await stripe.checkout.sessions.retrieve(stripeId);
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
    amount: amount,
    currency: "usd",
    confirm: true,
    return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders`,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const contractors = await prisma.contractor.findMany({
      select: { email: true, boughtZipCodes: true, stripeId: true},
    });

    for (const contractor of contractors) {
      const { email, boughtZipCodes } = contractor;

      let allResults: Contact[] = [];

      for (const zipCode of boughtZipCodes) {
        const postData = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "zip",
                  operator: "EQ",
                  value: zipCode,
                },
              ],
            },
          ],
          properties: [
            "id",
            "hs_lead_status",
            "firstname",
            "lastname",
            "email",
            "phone",
            "zip",
          ],
        };

        try {
          const hubspotResponse = await fetch(
            "https://api.hubapi.com/crm/v3/objects/contacts/search",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${HUBSPOT_API_KEY}`,
              },
              body: JSON.stringify(postData),
            }
          );

          if (!hubspotResponse.ok) {
            const errorBody = await hubspotResponse.text();
            throw new Error(
              `HubSpot API request failed with status ${hubspotResponse.status}: ${errorBody}`
            );
          }

          const data = await hubspotResponse.json();

          const filteredResults = data.results.filter(
            (contact: HSLead) => contact.properties.hs_lead_status === "OPEN"
          );

          const results = filteredResults.map((contact: Contact) => ({
            id: contact.id,
            ...contact.properties,
          }));

          allResults = [...allResults, ...results];
        } catch (error) {
          console.error(
            `Error processing zip code ${zipCode} from HubSpot:`,
            error
          );
        }
      }

      sendEmail(email, allResults);

      await chargeContractor(contractor.stripeId, allResults.length * PRICE_PER_LEAD);

    }

    res.status(200).json({ message: "Cron job executed successfully" });
  } catch (error) {
    console.error("Error executing cron job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
