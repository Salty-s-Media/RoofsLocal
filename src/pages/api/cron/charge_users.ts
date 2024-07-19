import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Cron job executed');

  res.status(200).json({ message: 'Cron job executed successfully' });
}
