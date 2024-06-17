import { validateEmailFormat, validatePhoneNumber } from "@/utils/utils";
import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface Contractor {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  company: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let { firstName, lastName, email, phone, zip, company }: Contractor = body;

  // Log the received customer info for debugging purposes
  console.log(
    "Company Info: ",
    firstName,
    lastName,
    email,
    phone,
    zip,
    company
  );

  //append +1 to the beginning of phone for auto validation on hubspot side
  const trimmedPhone = phone.trim();

  // Check if the phone number already starts with "+1 "
  if (!trimmedPhone.startsWith("+1")) {
    // Append "+1 " only if it's not already there
    const cleanedPhone = "+1 " + trimmedPhone;
    phone = cleanedPhone;
  } else {
    phone = trimmedPhone;
  }

  const isPhoneValid = validatePhoneNumber(phone);
  const isEmailValid = validateEmailFormat(email);

  if (!isPhoneValid) {
    console.error("Invalid phone number format");
    return NextResponse.json({ error: "Bad Phone Number" }, { status: 500 });
  }
  if (!isEmailValid) {
    console.error("Invalid email format");
    return NextResponse.json({ error: "Bad Email" }, { status: 500 });
  }

  if (isPhoneValid && isEmailValid) {
    try {
      const postData = {
        properties: {
          email: email,
          firstname: firstName,
          lastname: lastName,
          phone: phone,
          zip: zip,
          company: company,
        },
      };

      // Construct the full URL including the API key
      const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts`;

      const hubspotResponse = await fetch(hubspotUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify(postData),
      });

      if (!hubspotResponse.ok) {
        const responseBody = await hubspotResponse.text();
        throw new Error(
          `HubSpot API request failed with status ${hubspotResponse.status}: ${responseBody}`
        );
      }

      return NextResponse.json(
        { message: "Completed Creating a Company" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching contacts from HubSpot:", error);

      return NextResponse.json(
        { error: "Failed to fetch contacts from HubSpot" },
        { status: 500 }
      );
    }
  }
}
