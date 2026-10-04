import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocument } from '../src/openapi.js';

const target = join(process.cwd(), 'openapi.json');
writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
process.stdout.write(`[openapi] wrote ${target}\n`);
