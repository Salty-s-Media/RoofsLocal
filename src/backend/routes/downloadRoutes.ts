import express from 'express';
import { getDownloads, getDownloadById } from '../controllers/downloadController';

const router = express.Router();

router.get('/downloads', getDownloads);
router.get('/downloads/:id', getDownloadById);

export default router;
