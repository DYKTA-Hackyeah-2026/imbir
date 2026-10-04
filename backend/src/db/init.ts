import { pool } from './index.js';

/**
 * Seeds development data required by the creator ("kreator pomysłów") wizard.
 *
 * Schema ownership lives with Drizzle migrations (`npm run db:migrate`); this
 * function only ensures the demo user and the default `value_options` used by
 * `GET /innovations/options` exist. It never creates or alters tables.
 */
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure a default demo user exists for frictionless development.
    await client.query(`
      INSERT INTO "users" ("email", "name")
      VALUES ('demo@hubmi.io', 'Użytkownik Demo')
      ON CONFLICT ("email") DO NOTHING;
    `);

    // Seed initial default value_options if table is empty.
    const countRes = await client.query('SELECT COUNT(*) AS count FROM "value_options"');
    if (Number.parseInt(countRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO "value_options" ("type", "code", "label") VALUES
        ('functional', 'save_time', 'Oszczędność czasu'),
        ('functional', 'cost_reduction', 'Redukcja kosztów'),
        ('functional', 'accessibility', 'Większa dostępność usług'),
        ('functional', 'quality_improvement', 'Poprawa jakości życia'),
        ('emotional', 'security', 'Poczucie bezpieczeństwa'),
        ('emotional', 'dignity', 'Poczucie godności i szacunku'),
        ('emotional', 'community', 'Poczucie przynależności do społeczności'),
        ('emotional', 'empowerment', 'Poczucie sprawczości i niezależności')
        ON CONFLICT ("code") DO NOTHING;
      `);
    }

    await client.query('COMMIT');
    process.stdout.write('[db] Seed data ensured.\n');
  } catch (error) {
    await client.query('ROLLBACK');
    process.stderr.write(
      `[db] Error seeding database (run "npm run db:migrate" first): ${String(error)}\n`,
    );
    throw error;
  } finally {
    client.release();
  }
}
