import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { Parser } from "json2csv";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);
const json2csvParser = new Parser();

interface HubSpotContact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    createdate: string;
    hs_lead_status: string;
    lead_revenue: string | null;
  };
}

interface HubSpotSearchResponse {
  total: number;
  results: HubSpotContact[];
  paging?: {
    next?: { after: string };
  };
}

interface MappedLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  createdAt: string;
  status: string;
  revenue: number | null;
}

const LEAD_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "address",
  "city",
  "zip",
  "createdate",
  "hs_lead_status",
  "lead_revenue",
];

/**
 * Migrate legacy HubSpot statuses to the new pipeline values.
 * CONNECTED  → APPOINTMENT_COMPLETED
 * IN_PROGRESS → APPOINTMENT_SCHEDULED
 * OPEN        → NEW_LEAD
 */
const STATUS_MIGRATION: Record<string, string> = {
  OPEN: "NEW_LEAD",
  IN_PROGRESS: "APPOINTMENT_SCHEDULED",
  CONNECTED: "APPOINTMENT_COMPLETED",
};

/**
 * Maps a HubSpot contact to our lead shape.
 * Revenue is only populated for SOLD leads.
 */
function mapContact(
  contact: HubSpotContact,
  pricePerLeadDollars: number
): MappedLead {
  const rawStatus = contact.properties.hs_lead_status || "NEW_LEAD";
  const status = STATUS_MIGRATION[rawStatus] || rawStatus;
  const rawRevenue = contact.properties.lead_revenue;

  let revenue: number | null = null;
  if (status === "SOLD") {
    revenue = rawRevenue ? parseFloat(rawRevenue) : 0;
  }

  return {
    id: contact.id,
    firstName: contact.properties.firstname || "",
    lastName: contact.properties.lastname || "",
    email: contact.properties.email || "",
    phone: contact.properties.phone || "",
    streetAddress: contact.properties.address || "",
    city: contact.properties.city || "",
    zipCode: contact.properties.zip || "",
    createdAt: contact.properties.createdate || "",
    status,
    revenue,
  };
}

async function sendEmail(email: string, leads: MappedLead[]) {
  if (leads.length === 0) return;
  await resend.emails.send({
    from: "Roofs Local <info@roofslocal.app>",
    to: [email, "web@saltysmedia.com"],
    subject: "Leads",
    text: "Attached are your leads",
    attachments: [
      {
        filename: "leads.csv",
        content: Buffer.from(json2csvParser.parse(leads)).toString("base64"),
      },
    ],
  });
}

/**
 * Fetches ALL leads from HubSpot for a contractor by company name.
 * Supports optional date-range filtering. Paginates through all results.
 */
async function fetchLeadsForCompany(
  companyName: string,
  pricePerLeadDollars: number,
  startDate?: string,
  endDate?: string
): Promise<MappedLead[]> {
  const allLeads: MappedLead[] = [];
  let after: string | undefined;

  do {
    try {
      const filters: Array<{
        propertyName: string;
        operator: string;
        value: string;
      }> = [
        {
          propertyName: "company",
          operator: "EQ",
          value: companyName,
        },
      ];

      if (startDate) {
        filters.push({
          propertyName: "createdate",
          operator: "GTE",
          value: new Date(startDate).getTime().toString(),
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.push({
          propertyName: "createdate",
          operator: "LTE",
          value: end.getTime().toString(),
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: LEAD_PROPERTIES,
        limit: 100,
      };
      if (after) body.after = after;

      const hubspotResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!hubspotResponse.ok) {
        const errorBody = await hubspotResponse.text();
        console.error(
          `HubSpot API error for company "${companyName}": status=${hubspotResponse.status} body=${errorBody}`
        );
        break;
      }

      const data: HubSpotSearchResponse = await hubspotResponse.json();
      allLeads.push(
        ...data.results.map((c) => mapContact(c, pricePerLeadDollars))
      );
      after = data.paging?.next?.after;
    } catch (error) {
      console.error(
        `Error fetching leads for company "${companyName}":`,
        error
      );
      break;
    }
  } while (after);

  allLeads.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allLeads;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id, startDate, endDate } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid contractor ID" });
  }

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id },
      select: {
        email: true,
        company: true,
        pricePerLead: true,
      },
    });

    if (!contractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const start = typeof startDate === "string" ? startDate : undefined;
    const end = typeof endDate === "string" ? endDate : undefined;

    // pricePerLead is stored in cents — convert to dollars
    const pricePerLeadDollars = (contractor.pricePerLead ?? 0) / 100;

    const leads = await fetchLeadsForCompany(
      contractor.company,
      pricePerLeadDollars,
      start,
      end
    );

    console.log(
      `[leads/${id}] company="${contractor.company}", dateRange=${start || "none"}..${end || "none"}, leadsFound=${leads.length}`
    );

    const totalLeads = leads.length;
    const moneySpent = totalLeads * pricePerLeadDollars;

    // Revenue = only SOLD leads
    const soldLeads = leads.filter((l) => l.status === "SOLD");
    const totalRevenue = soldLeads.reduce(
      (sum, l) => sum + (l.revenue ?? 0),
      0
    );

    const appointmentCompletedLeads = leads.filter(
      (l) => l.status === "APPOINTMENT_COMPLETED"
    );

    // Email NEW_LEAD leads only (preserves original behavior)
    const newLeads = leads.filter((l) => l.status === "NEW_LEAD");
    sendEmail(contractor.email, newLeads);

    return res.status(200).json({
      contractorName: contractor.company,
      pricePerLead: pricePerLeadDollars,
      totalLeads,
      moneySpent,
      soldJobs: soldLeads.length,
      appointmentCompletedCount: appointmentCompletedLeads.length,
      totalRevenue,
      leads,
    });
  } catch (error) {
    console.error("Error fetching contractor data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}