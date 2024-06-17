import { NextRequest, NextResponse } from "next/server";

interface Contact {
  id: string;
  properties: {
    company: string;
    email: string;
    phone: string;
    zip: string;
  };
}

interface REQ {
  company: string;
  email: string;
  phone: string;
  zipCode: string;
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
          Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
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

async function searchContactsByCompanyName(
  companyName: string
): Promise<string[]> {
  const searchQuery = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "company",
            operator: "EQ",
            value: companyName,
          },
        ],
      },
    ],
    properties: ["id"],
  };

  try {
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify(searchQuery),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Search failed with status ${response.status}: ${errorBody}`
      );
    }

    const data = await response.json();
    const contactIds = data.results.map((result: any) => result.id);
    return contactIds;
  } catch (error) {
    console.error("Error searching contacts by company name:", error);
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    let { email, phone, zipCode, company }: REQ = body;

    if (!company) {
      const errorResponse = NextResponse.json(
        { error: "Failed to receive a company name" },
        { status: 500 }
      );
      return errorResponse;
    }

    const idResults = await searchContactsByCompanyName(company);

    console.log("Company ID: ", idResults);
    const propertiesToUpdate = {
      properties: {
        company: company,
        email: email,
        phone: phone,
        zip: zipCode,
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
