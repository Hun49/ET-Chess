import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateThemeCss } from '../src/design-tokens.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

const cssContent = generateThemeCss();

// 1. Write to packages/config/theme.css
const configThemeCssPath = path.resolve(__dirname, '../theme.css');
fs.writeFileSync(configThemeCssPath, cssContent, 'utf-8');

// 2. Also write directly to apps/web/src/theme.css and apps/admin/src/theme.css for absolute reliability
const webThemeCssPath = path.resolve(rootDir, 'apps/web/src/theme.css');
fs.writeFileSync(webThemeCssPath, cssContent, 'utf-8');

const adminThemeCssPath = path.resolve(rootDir, 'apps/admin/src/theme.css');
fs.writeFileSync(adminThemeCssPath, cssContent, 'utf-8');

console.log('Successfully generated theme.css across config, web, and admin!');
