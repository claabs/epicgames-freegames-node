import { ensureDir, writeJSON } from 'fs-extra/esm';

import { appConfigSchema } from '../src/common/config/zod.js';

const jsonSchema = appConfigSchema.toJSONSchema({ target: '2020-12' });

await ensureDir('docs');
await writeJSON('docs/app-config.schema.json', jsonSchema, { spaces: 2 });
