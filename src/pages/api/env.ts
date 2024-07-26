import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`App is running in ${process.env.VERCEL_ENV} mode`);
  res.status(200);
}