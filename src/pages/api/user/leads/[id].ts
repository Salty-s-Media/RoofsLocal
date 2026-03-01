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

// HubSpot contact info only — no status fields needed
const LEAD_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "address",
  "city",
  "zip",
  "createdate",
];

/**
 * Maps a HubSpot contact to our lead shape.
 * Status and revenue come from the local LeadStatus table, NOT HubSpot.
 */
function mapContact(
  contact: HubSpotContact,
  localStatus: string,
  localRevenue: number
): MappedLead {
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
    status: localStatus,
    revenue: localStatus === "SOLD" ? localRevenue : null,
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
 * Merges in status + revenue from the local LeadStatus table.
 * Any lead without a local status row defaults to NEW_LEAD / revenue 0.
 */
async function fetchLeadsForCompany(
  contractorId: string,
  companyName: string,
  pricePerLeadDollars: number,
  startDate?: string,
  endDate?: string
): Promise<MappedLead[]> {
  // 1. Fetch contact info from HubSpot (no status fields)
  const hubspotContacts: HubSpotContact[] = [];
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
      hubspotContacts.push(...data.results);
      after = data.paging?.next?.after;
    } catch (error) {
      console.error(
        `Error fetching leads for company "${companyName}":`,
        error
      );
      break;
    }
  } while (after);

  if (hubspotContacts.length === 0) return [];

  // 2. Fetch all local statuses for this contractor in one query
  const contactIds = hubspotContacts.map((c) => c.id);
  const localStatuses = await prisma.leadStatus.findMany({
    where: {
      contractorId,
      hubspotContactId: { in: contactIds },
    },
  });

  // Build a lookup map: hubspotContactId → { status, revenue }
  const statusMap = new Map<string, { status: string; revenue: number }>();
  for (const ls of localStatuses) {
    statusMap.set(ls.hubspotContactId, {
      status: ls.status,
      revenue: ls.revenue,
    });
  }

  // 3. Merge: HubSpot contact info + local status/revenue
  const allLeads = hubspotContacts.map((contact) => {
    const local = statusMap.get(contact.id);
    const status = local?.status ?? "NEW_LEAD";
    const revenue = local?.revenue ?? 0;
    return mapContact(contact, status, revenue);
  });

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
      id,
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

    // Revenue = only SOLD leads (from local DB)
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
