import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['dist/client/index.html', 'admin-dist/index.html'])
  await access(path.join(root, file));
const output = path.join(
  root,
  'outputs',
  'azure-' + new Date().toISOString().replace(/[:.]/g, '-'),
);
await mkdir(output, { recursive: true });
await cp(path.join(root, 'dist/client'), path.join(output, 'public'), {
  recursive: true,
});
await cp(path.join(root, 'admin-dist'), path.join(output, 'public/admin'), {
  recursive: true,
});
await mkdir(path.join(output, 'backend'));
for (const file of [
  'api.php',
  'bootstrap.php',
  'schema.sql',
  'categories.sql',
  'access-roles.sql',
])
  await cp(
    path.join(root, 'backend', file),
    path.join(output, 'backend', file),
  );
await mkdir(path.join(output, 'tools'));
await cp(
  path.join(root, 'tools/admin-account.php'),
  path.join(output, 'tools/admin-account.php'),
);
await mkdir(path.join(output, 'public/api'));
await writeFile(
  path.join(output, 'public/api/index.php'),
  "<?php\nrequire __DIR__.'/../../backend/api.php';\n",
);
await writeFile(
  path.join(output, 'public/.htaccess'),
  `Options -Indexes
RewriteEngine On
RewriteRule ^facilities\\.json$ api/index.php?action=public [L,QSD]
`,
);
await cp(
  path.join(root, 'deploy/azure/nginx.conf'),
  path.join(output, 'nginx.conf'),
);
await cp(
  path.join(root, 'deploy/azure/startup.sh'),
  path.join(output, 'startup.sh'),
);
console.log(output);
