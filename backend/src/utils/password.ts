import bcrypt from 'bcryptjs';
import config from '../config/config.js';

const DUMMY_PASSWORD_HASH = '$2b$12$AeRxO8xyZbmzsW7TAwrBrOtO0N1TuhhxyPvZ0EIYpOaVyMKmYFs9a';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function wasteTimeLikePasswordCheck(plain: string): Promise<void> {
  await verifyPassword(plain, DUMMY_PASSWORD_HASH);
}
