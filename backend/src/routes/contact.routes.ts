import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import * as controller from '../modules/content/content.controller.js';
import { contactSchema } from '../modules/content/content.schemas.js';
import { sensitiveRateLimiter } from '../middleware/rate-limit.js';

const contactRouter = Router();

contactRouter.post('/', sensitiveRateLimiter, validateBody(contactSchema), controller.submitContact);

export default contactRouter;
