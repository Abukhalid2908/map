import { readFile, writeFile } from 'node:fs/promises';
import { validateDataset, publicDataset } from '../lib/data.mjs';
const args = process.argv.slice(2),
  exportMode = args[0] === '--export',
  file = exportMode ? args[1] : args[0] || 'public/facilities.json';
try {
  const data = JSON.parse(
    (await readFile(file, 'utf8')).replace(/^\uFEFF/, ''),
  );
  const result = validateDataset(data, { publicOnly: !exportMode });
  if (result.errors.length) throw Error(result.errors.join('\n'));
  for (const warning of result.warnings) console.warn(warning);
  if (exportMode) {
    if (!args[2]) throw Error('Tentukan path output yang akan ditulis.');
    await writeFile(
      args[2],
      JSON.stringify(publicDataset(data), null, 2) + '\n',
    );
  }
  console.log('Dataset valid: ' + data.facilities.length + ' entri.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
