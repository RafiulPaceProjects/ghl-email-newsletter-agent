import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(currentDir, 'schemas');

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

const validatorCache = new Map();

async function getValidator(contractName) {
  const cached = validatorCache.get(contractName);
  if (cached) {
    return cached;
  }

  const schemaPath = resolve(schemasDir, `${contractName}.schema.json`);
  const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
  const validator = ajv.compile(schema);
  validatorCache.set(contractName, validator);
  return validator;
}

export async function validateContract(contractName, data) {
  const validator = await getValidator(contractName);
  const ok = validator(data);

  return {
    ok: Boolean(ok),
    errors: validator.errors ?? [],
  };
}

export async function assertContract(contractName, data) {
  const result = await validateContract(contractName, data);
  if (result.ok) {
    return;
  }

  throw new Error(
    `${contractName} validation failed: ${ajv.errorsText(result.errors, {
      separator: '; ',
      dataVar: contractName,
    })}`,
  );
}
