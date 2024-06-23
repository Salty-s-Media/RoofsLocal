import {
  validateEmailFormat,
  validatePhoneNumber,
} from "../../../../utils/utils";
import { NextApiRequest, NextApiResponse } from "next";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
}

// Adjusted to use NextApiRequest and NextApiResponse
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let { firstName, lastName, email, phone, zip }: FormData = req.body;

  // Log the received customer info for debugging purposes
  console.log("Customer Info: ", firstName, lastName, email, phone, zip);

  // Append +1 to the beginning of phone for auto validation on hubspot side
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
    return res.status(500).json({ error: "Bad Phone Number" });
  }
  if (!isEmailValid) {
    console.error("Invalid email format");
    return res.status(500).json({ error: "Bad Email" });
  }

  // Don't create a contact unless everything has been validated. Set lead status to open
  if (isPhoneValid && isEmailValid) {
    try {
      const postData = {
        properties: {
          firstname: firstName,
          lastname: lastName,
          email: email,
          phone: phone,
          zip: zip,
          hs_lead_status: "OPEN",
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

      return res.status(200).json({ message: "Completed Creating a Contact" });
    } catch (error) {
      console.error("Error fetching contacts from HubSpot:", error);

      return res
        .status(500)
        .json({ error: "Failed to fetch contacts from HubSpot" });
    }
  }
}
