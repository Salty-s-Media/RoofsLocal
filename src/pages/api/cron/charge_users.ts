import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { Parser } from "json2csv";
import Stripe from "stripe";
import twilio from "twilio";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);
const json2csvParser = new Parser();
const PRICE_PER_LEAD = parseFloat(process.env.PRICE_PER_LEAD || "100");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const url = process.env.NEXT_PUBLIC_SERVER_URL;

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
    owner: string;
    hs_lead_status: string;
  };
}

function sendEmail(email: string, leads: Contact[]) {
  if (leads.length === 0) return;
  resend.emails.send({
    from: "Roofs Local <info@roofslocal.app>", // TODO: Change for production
    to: [email],
    subject: "Leads",
    text: `Attached are your leads ${
      leads.length
    }. Your card on file will be charged ${leads.length * PRICE_PER_LEAD} USD.`,
    attachments: [
      {
        filename: "leads.csv",
        content: Buffer.from(json2csvParser.parse(leads)).toString("base64"), // Attach leads as CSV
      },
    ],
  });
}

async function chargeContractor(sessionId: string, amount: number) {
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
    amount: amount,
    currency: "usd",
    confirm: true,
    return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders`,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    setup_future_usage: "off_session",
  });

  console.log(
    "Leads were found for your area, and you were billed $",
    (amount / 100).toFixed(2)
  );

  return payment;
}

async function batchUpdateContacts(
  contactIds: string[],
  propertiesToUpdate: Partial<HSLead>
) {
  const updateRequests = contactIds.map((id) => ({
    id,
    properties: propertiesToUpdate.properties,
  }));

  const requestBody = {
    inputs: updateRequests,
  };

  try {
    console.log(requestBody);
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const resp = await response.text();
      throw new Error(
        `Batch update failed with status ${response.status}: ${resp}`
      );
    }

    const responseBody = await response.json();
    console.log("Batch update response:", responseBody);
    return responseBody;
  } catch (error) {
    console.error("Error during batch update:", error);
    throw error;
  }
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
      select: {
        email: true,
        boughtZipCodes: true,
        stripeSessionId: true,
        company: true,
        phone: true, // Add phone to the select
        phoneVerified: true, // Add phoneVerified to the select
      },
    });

    for (const contractor of contractors) {
      const { phoneVerified, phone } = contractor;
      if (!phoneVerified) {
        try {
          const resp = await client.calls.create({
            from: "+17543003917",
            to: phone,
            url: `http://demo.twilio.com/docs/voice.xml`,
            machineDetection: "DetectMessageEnd",
            statusCallback: `${url}api/twilio/callStatus`,
            statusCallbackEvent: ["completed"],
            statusCallbackMethod: "POST",
          });
        } catch (error) {
          console.error("Failed to create call:", error);
          await prisma.contractor.delete({
            where: { email: contractor.email },
          });
          continue;
        }
      }
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

          console.log(hubspotResponse);

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

          const allResultsIds = allResults.map((result) => result.id);
          await batchUpdateContacts(allResultsIds, {
            properties: {
              owner: contractor.company,
              hs_lead_status: "CONNECTED",
            },
          });
        } catch (error) {
          console.error(
            `Error processing zip code ${zipCode} from HubSpot:`,
            error
          );
        }
      }

      sendEmail(email, allResults);
      const cost = allResults.length * PRICE_PER_LEAD;

      if (allResults.length > 0) {
        const payment = await chargeContractor(
          contractor.stripeSessionId,
          cost
        );
        if (payment.status != "succeeded") {
          console.error("Payment didn't process:", payment.status);
          res.status(204).json({ message: "Returned no results" });
        }
      }
    }

    res.status(200).json({ message: "Cron job executed successfully" });
  } catch (error) {
    console.error("Error executing cron job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
