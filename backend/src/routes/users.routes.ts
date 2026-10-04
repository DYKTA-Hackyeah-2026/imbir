import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const usersRouter = Router();

interface CreateUserBody {
  email?: unknown;
  name?: unknown;
}

usersRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await db.select().from(users).orderBy(users.createdAt);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const { email, name } = req.body as CreateUserBody;
    if (typeof email !== 'string' || typeof name !== 'string' || email.length === 0 || name.length === 0) {
      res.status(400).json({ error: 'email and name are required strings' });
      return;
    }
    const [row] = await db.insert(users).values({ email, name }).returning();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

export default usersRouter;
