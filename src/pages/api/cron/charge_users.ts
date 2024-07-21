import type { NextApiRequest, NextApiResponse } from 'next';
 
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const result = await fetch(
    'http://worldtimeapi.org/api/timezone/America/Chicago',
  );
  const data = await result.json();
 
  return response.json({ datetime: data.datetime });
}
