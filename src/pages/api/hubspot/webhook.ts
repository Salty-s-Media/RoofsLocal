import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_SALTYS_MEDIA_PHONE_NUMBER = process.env.GHL_SALTYS_MEDIA_PHONE_NUMBER;


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method != "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { body } = req;
  console.log("Webhook received:", body[0]);
  const objectId = body[0].objectId;

  try {
    const contact = await getHubspotContact(objectId);
    const zip = contact.zip;
    const contractor = await getMatchingContractor(zip);
    if (!contractor) {
      res.status(200).send({ message: `No contractor found for zip code: ${zip}, nothing done` });
    }
    await importHubspotContact(contact, contractor);
    await updateHubspotContact(objectId);
    const ghlData = await createGHLContact(contact, contractor);
    if (ghlData) {
      await createGHLOpporunity(ghlData.contact.id, contact, contractor);
    }
    await sendGHLText(contact, contractor);
    sendSummaryEmail(contact, contractor);
    res.status(200).send({ message: `Lead ${objectId} processed by webhook` });
  } catch (error) {
    console.error("Error processing webhook data from HubSpot:", error);
    res.status(500).send({ error: error });
  }
}


async function getHubspotContact(objectId: string) {
  const postData = {
    filterGroups: [{
      filters: [{
        propertyName: "hs_object_id",
        operator: "EQ",
        value: objectId,
      }]
    }],
    properties: [
      "id",
      "hs_lead_status",
      "firstname",
      "lastname",
      "email",
      "phone",
      // "plan",
      // "job_status",
      "contact_owner",
      "zip",
    ]
  };

  const hubspotResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUBSPOT_API_KEY}`,
    },
    body: JSON.stringify(postData),
  });

  if (!hubspotResponse.ok) {
    const errorBody = await hubspotResponse.text();
    throw new Error(`Failed to get contact: ${hubspotResponse.status} - ${errorBody}`);
  }

  const data = await hubspotResponse.json();
  console.log("HubSpot response received:", data);
  if (data.total === 0) {
    throw new Error(`No HubSpot contact found with hs_object_id: ${objectId}`);
  }

  const contact = data.results[0].properties;
  console.log("HubSpot contact object: ", contact);
  return contact;
}


async function getMatchingContractor(zip: string) {
  const contractor = await prisma.contractor.findFirst({
    where: {
      zipCodes: {
        has: zip,
      },
    },
  });
  return contractor;
}


async function importHubspotContact(contact: any, contractor: any) {
  const contractorKey = contractor?.hubspotKey;

  delete contact.createdate;
  delete contact.lastmodifieddate;
  contact.company = "Roofs Local";

  const createData = {
    properties: contact,
  };

  if (contractor?.hubspotKey != null && contractor?.hubspotKey != "") {
    const hubspotResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${contractorKey}`,
      },
      body: JSON.stringify(createData),
    });

    if (!hubspotResponse.ok) {
      const errorBody = await hubspotResponse.text();
      console.warn(`Failed to create HubSpot contract: ${hubspotResponse.status} - ${errorBody}`);
      return;
    }

    const createContactResult = await hubspotResponse.json();
    console.log("HubSpot contact created: ", createContactResult);
  }
}


async function updateHubspotContact(objectId: string) {
  const hubspotResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUBSPOT_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: [{
        id: objectId,
        properties: {
          hs_lead_status: "IN_PROGRESS",
        }
      }]
    })
  });

  if (!hubspotResponse.ok) {
    const errorBody = await hubspotResponse.text();
    console.warn(`Failed to update HubSpot contact: ${hubspotResponse.status} - ${errorBody}`);
  }

  console.log("HubSpot contact updated: ", hubspotResponse);
}


async function createGHLContact(contact: any, contractor: any) {
  const phoneNumber = contact.phone;
  const formattedPhoneNumber = phoneNumber && !phoneNumber.startsWith('+') ? `+1${phoneNumber}` : phoneNumber;

  const ghlRequestBody = {
    firstName: contact.firstname,
    lastName: contact.lastname,
    email: contact.email,
    phone: formattedPhoneNumber,
    postalCode: contact.zip,
    locationId: contractor?.ghlLocationId ? contractor.ghlLocationId : "",
  }

  const ghlResponse = await fetch("https://services.leadconnectorhq.com/contacts/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${contractor?.ghlKey}`,
      version: "2021-07-28"
    },
    body: JSON.stringify(ghlRequestBody),
  });

  if (!ghlResponse.ok) {
    const errorBody = await ghlResponse.text();
    console.warn(`Failed to create contact: ${ghlResponse.status} - ${errorBody}`);
    return null;
  }

  console.log("GHL contact created: ", ghlResponse);
  const ghlData = await ghlResponse.json();
  return ghlData;
}


async function createGHLOpporunity(contactId: string, contact: any, contractor: any) {
  const ghlResponse = await fetch("https://services.leadconnectorhq.com/opportunities/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${contractor?.ghlKey}`,
      version: "2021-07-28"
    },
    body: JSON.stringify({
      pipelineId: contractor?.ghlPipelineId ? contractor.ghlPipelineId : "",
      pipelineStageId: contractor?.ghlPipelineStageId ? contractor.ghlPipelineStageId : "",
      locationId: contractor?.ghlLocationId ? contractor.ghlLocationId : "",
      name: `${contact.firstname} ${contact.lastname}`,
      status: "open",
      contactId: contactId
    }),
  });

  if (!ghlResponse.ok) {
    const errorBody = await ghlResponse.text();
    console.warn(`Failed to create GHL opportunity: ${ghlResponse.status} - ${errorBody}`);
    return;
  }

  console.log("GHL create oportunity response: ", ghlResponse);
}


async function sendGHLText(contact: any, contractor: any) {
  const phoneNumber = contractor?.phone;
  const formattedPhoneNumber = phoneNumber && !phoneNumber.startsWith('+') ? `+1${phoneNumber}` : phoneNumber;
  const ghlResponse = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GHL_API_KEY}`,
      version: "2021-04-15"
    },
    body: JSON.stringify({
      type: "SMS",
      contactId: contractor?.ghlContactId ? contractor.ghlContactId : "",
      message: `A new lead was just pushed to you hubspot account by Roofs Local! \n${contact.firstname} ${contact.lastname} - ${contact.email} - ${contact.phone} - ${contact.zip}`,
      fromNumber: GHL_SALTYS_MEDIA_PHONE_NUMBER,
      toNumber: formattedPhoneNumber
    }),
  });

  if (!ghlResponse.ok) {
    const errorBody = await ghlResponse.text();
    console.warn(`Failed to send GHL text: ${ghlResponse.status} - ${errorBody}`);
    return;
  }

  console.log("GHL text sent: ", ghlResponse);
}


function sendSummaryEmail(contact: any, contractor: any) {
  resend.emails.send({
    from: "Roofs Local <info@roofslocal.app>",
    to: contractor?.email ? [contractor.email] : [],
    subject: "Roofs Local: New Lead",
    text: `A new lead was just pushed to you hubspot account by Roofs Local! \n
          ${contact.firstname} ${contact.lastname} - ${contact.email} - ${contact.phone} - ${contact.zip}`,
  });
}
