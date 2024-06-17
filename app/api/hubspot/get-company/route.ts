import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

export async function GET() {
  try {
    let zip = "12345";

    if (!zip) {
      const errorResponse = NextResponse.json(
        { error: "Failed to fetch leads from HubSpot" },
        { status: 500 }
      );
      return errorResponse;
    }
    const postData = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "zip",
              operator: "EQ",
              value: zip,
            },
            {
              propertyName: "company",
              operator: "HAS_PROPERTY",
            },
          ],
        },
      ],
      properties: ["company", "zip"],
    };

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
      throw new Error(
        `HubSpot API request failed with status ${hubspotResponse.status}`
      );
    }

    const data = await hubspotResponse.json();

    console.log(data);

    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    console.error("Error fetching leads from HubSpot:", error);

    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch leads from HubSpot" }),
      { status: 500 }
    );
  }
}
