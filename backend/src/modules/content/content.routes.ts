import { Router } from 'express';
import { validateQuery } from '../../middleware/validate.js';
import * as controller from './content.controller.js';
import {
  featuredQuerySchema,
  learningQuerySchema,
  materialsQuerySchema,
  popularQuerySchema,
  reportsQuerySchema,
  searchQuerySchema,
} from './content.schemas.js';

const contentRouter = Router();

contentRouter.get('/categories', controller.listCategories);
contentRouter.get('/topics', controller.listTopics);

contentRouter.get('/materials/featured', validateQuery(featuredQuerySchema), controller.listFeatured);
contentRouter.get('/materials', validateQuery(materialsQuerySchema), controller.listMaterials);
contentRouter.get('/materials/:slug', controller.getMaterial);
contentRouter.get('/materials/:id/download', controller.downloadMaterial);

contentRouter.get('/reports', validateQuery(reportsQuerySchema), controller.listReports);
contentRouter.get('/learning', validateQuery(learningQuerySchema), controller.listLearning);

contentRouter.get('/search/popular', validateQuery(popularQuerySchema), controller.popularSearches);
contentRouter.get('/search', validateQuery(searchQuerySchema), controller.search);

contentRouter.get('/home', controller.home);

export default contentRouter;
