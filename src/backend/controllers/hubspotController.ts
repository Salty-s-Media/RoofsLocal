import { Request, Response } from 'express';
import axios from 'axios';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

export const getLeads = async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      }
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching leads from HubSpot:', error);
    res.status(500).json({ error: 'Failed to fetch leads from HubSpot' });
  }
};