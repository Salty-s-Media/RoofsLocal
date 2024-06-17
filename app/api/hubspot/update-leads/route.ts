import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface Contact {
  id: string;
  properties: {
    owner: string;
    hs_lead_status: string;
  };
}

interface REQ {
  company: string;
  idResults: string[];
}

async function batchUpdateContacts(
  contactIds: string[],
  propertiesToUpdate: Partial<Contact>
) {
  const updateRequests = contactIds.map((id) => ({
    id,
    properties: propertiesToUpdate.properties,
  }));

  const requestBody = {
    inputs: updateRequests,
  };

  try {
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

    return new NextResponse(JSON.stringify({ responseBody }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during batch update:", error);
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    let { company, idResults }: REQ = body;

    if (!idResults) {
      const errorResponse = NextResponse.json(
        { error: "Failed to receive a zip" },
        { status: 500 }
      );
      return errorResponse;
    }

    console.log("Contact IDs: ", idResults);
    const propertiesToUpdate = {
      properties: {
        owner: `${company}`,
        hs_lead_status: "CONNECTED",
      },
    };

    const data = await batchUpdateContacts(idResults, propertiesToUpdate);

    return new NextResponse(JSON.stringify({ message: "The update worked" }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error during operation:", error);

    return new NextResponse(
      JSON.stringify({ error: "Failed to update contacts' owner" }),
      {
        status: 500,
      }
    );
  }
}
