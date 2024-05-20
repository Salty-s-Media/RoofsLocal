import express from 'express';
import { createDownload, getDownloads, getDownloadById, updateDownload, deleteDownload, countDownloads } from '../controllers/downloadController';

const router = express.Router();

router.post('/downloads', createDownload);
router.get('/downloads', getDownloads);
router.get('/downloads/count', countDownloads);
router.get('/downloads/:id', getDownloadById);
router.put('/downloads/:id', updateDownload);
router.delete('/downloads/:id', deleteDownload);

export default router;
