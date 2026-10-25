import { writeJSON } from 'fs-extra/esm';

import { appConfigSchema } from '../src/common/config/zod.ts';

const jsonSchema = appConfigSchema.toJSONSchema({ target: '2020-12' });

await writeJSON('docs/app-config.schema.json', jsonSchema, { spaces: 2 });
