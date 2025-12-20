import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const outJsonPath = path.join(repoRoot, 'build-info.json');

const pkgRaw = await fs.readFile(packageJsonPath, 'utf8');
const pkg = JSON.parse(pkgRaw);

const buildNumber = process.env.GITHUB_RUN_NUMBER || 'dev';
const baseVersion = pkg.version || '0.0.0';

// Simple incrementing production counter: the workflow run number.
// Keep the UI display as just the counter (v2, v3, ...).
const displayVersion = buildNumber;

const jsonContent = JSON.stringify(
	{
		counter: String(buildNumber),
		baseVersion: String(baseVersion)
	},
	null,
	2
) + '\n';

await fs.writeFile(outJsonPath, jsonContent, 'utf8');

console.log(`Stamped build info -> ${path.relative(repoRoot, outJsonPath)} (v${displayVersion})`);
