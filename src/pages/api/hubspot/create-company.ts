import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const body = req.body;

      const postData = {
        properties: {
          name: body.name,
          phone: body.phone,
          zip: body.zip,
        },
      };

      const hubspotResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/companies",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify(postData),
        }
      );

      if (!hubspotResponse.ok) {
        const errorBody = await hubspotResponse.text();
        throw new Error(
          `HubSpot API request failed with status ${hubspotResponse.status}: ${errorBody}`
        );
      }

      const data = await hubspotResponse.json();

      console.log(data);

      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
