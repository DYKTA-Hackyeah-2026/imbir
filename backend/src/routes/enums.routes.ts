import { Router } from 'express';
import { pool } from '../db/index.js';
import {
  innovationStatusEnum,
  problemIntensityEnum,
  problemFrequencyEnum,
  problemScaleEnum,
  actorTypeEnum,
  affordabilityEnum,
  simplicityEnum,
  costTypeEnum,
  audienceTypeEnum,
  revenueValidationEnum,
  revenueScalabilityEnum,
  valueTypeEnum,
  channelTypeEnum,
} from '../db/schema.js';

const enumsRouter = Router();

const enumsList = [
  { name: innovationStatusEnum.enumName, schema: innovationStatusEnum },
  { name: problemIntensityEnum.enumName, schema: problemIntensityEnum },
  { name: problemFrequencyEnum.enumName, schema: problemFrequencyEnum },
  { name: problemScaleEnum.enumName, schema: problemScaleEnum },
  { name: actorTypeEnum.enumName, schema: actorTypeEnum },
  { name: affordabilityEnum.enumName, schema: affordabilityEnum },
  { name: simplicityEnum.enumName, schema: simplicityEnum },
  { name: costTypeEnum.enumName, schema: costTypeEnum },
  { name: audienceTypeEnum.enumName, schema: audienceTypeEnum },
  { name: revenueValidationEnum.enumName, schema: revenueValidationEnum },
  { name: revenueScalabilityEnum.enumName, schema: revenueScalabilityEnum },
  { name: valueTypeEnum.enumName, schema: valueTypeEnum },
  { name: channelTypeEnum.enumName, schema: channelTypeEnum },
];

enumsRouter.get('/', async (req, res) => {
  const shouldCreate = req.query.create === 'true' || req.query.init === 'true';

  let dbConnected = false;
  let dbError: string | null = null;
  const dbEnumsMap = new Map<string, string[]>();

  try {
    const dbResult = await pool.query<{ enum_name: string; enum_values: string[] }>(`
      SELECT
        t.typname AS enum_name,
        json_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname;
    `);

    dbConnected = true;
    for (const row of dbResult.rows) {
      dbEnumsMap.set(row.enum_name, row.enum_values);
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const results = [];

  for (const item of enumsList) {
    const enumName = item.name;
    const schemaValues = item.schema.enumValues;
    let dbValues = dbEnumsMap.get(enumName) ?? null;
    let createdNow = false;

    // Optional creation if requested via ?create=true
    if (shouldCreate && !dbValues && dbConnected) {
      try {
        const sqlValues = schemaValues.map((val) => `'${val.replace(/'/g, "''")}'`).join(', ');
        await pool.query(`CREATE TYPE "${enumName}" AS ENUM (${sqlValues});`);
        dbValues = [...schemaValues];
        dbEnumsMap.set(enumName, dbValues);
        createdNow = true;
      } catch (createErr) {
        dbError = createErr instanceof Error ? createErr.message : String(createErr);
      }
    }

    const dbValuesResolved = dbValues;
    const inDatabase = dbValuesResolved !== null;
    const valuesMatch = dbValuesResolved !== null &&
      schemaValues.length === dbValuesResolved.length &&
      schemaValues.every((val, idx) => val === dbValuesResolved[idx]);

    // Test casting in PostgreSQL if type exists
    let castTest: { status: 'passed' | 'failed' | 'skipped'; message?: string } = { status: 'skipped' };
    if (inDatabase && dbConnected) {
      try {
        const testValue = schemaValues[0];
        const testQuery = await pool.query(
          `SELECT $1::"${enumName}" AS test_result`,
          [testValue]
        );
        castTest = {
          status: 'passed',
          message: `PostgreSQL cast successfully accepted value '${testQuery.rows[0].test_result}'`,
        };
      } catch (castErr) {
        castTest = {
          status: 'failed',
          message: castErr instanceof Error ? castErr.message : String(castErr),
        };
      }
    }

    results.push({
      name: enumName,
      schemaValues,
      inDatabase,
      createdNow,
      databaseValues: dbValues,
      valuesMatch,
      castTest,
    });
  }

  const total = results.length;
  const inDbCount = results.filter((r) => r.inDatabase).length;
  const matchCount = results.filter((r) => r.valuesMatch).length;

  res.json({
    status: 'ok',
    database: {
      connected: dbConnected,
      error: dbError,
    },
    summary: {
      totalEnums: total,
      enumsInPostgres: inDbCount,
      enumsMatchingSchema: matchCount,
      allReady: inDbCount === total && matchCount === total,
    },
    help: inDbCount < total
      ? 'Some enums are not created in PostgreSQL yet. You can visit /test-enums?create=true to create them or run migrations.'
      : 'All enums are created in PostgreSQL and match the Drizzle schema.',
    enums: results,
  });
});

export default enumsRouter;
