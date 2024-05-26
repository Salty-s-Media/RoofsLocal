import express from 'express';
import { getLeads } from '../controllers/hubspotController';

const router = express.Router();

router.get('/leads', getLeads);

export default router;
