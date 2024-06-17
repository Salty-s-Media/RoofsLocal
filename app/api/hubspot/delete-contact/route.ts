import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface REQ {
  idResults: string[]; // Array of contact IDs to delete
}

// Function to delete a single contact
async function deleteContact(contactId: string): Promise<void> {
  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const resp = await response.text();
      throw new Error(`Delete failed with status ${response.status}: ${resp}`);
    }
  } catch (error) {
    console.error("Error during contact deletion:", error);
    throw error;
  }
}

// Delete multiple contacts
async function batchDeleteContacts(contactIds: string[]) {
  for (const id of contactIds) {
    await deleteContact(id);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    let { idResults }: REQ = body;

    if (!idResults || !idResults.length) {
      const errorResponse = NextResponse.json(
        { error: "No contact IDs provided for deletion" },
        { status: 400 }
      );
      return errorResponse;
    }

    console.log("Deleting contact IDs: ", idResults);
    await batchDeleteContacts(idResults);

    return new NextResponse(
      JSON.stringify({ message: "Contacts deleted successfully" }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error during deletion:", error);

    return new NextResponse(
      JSON.stringify({ error: "Failed to delete contacts" }),
      {
        status: 500,
      }
    );
  }
}
