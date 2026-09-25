const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'tests/unit');
const filter = process.argv[2] || '';

if (!fs.existsSync(dir)) {
  throw new Error(`测试目录不存在：${dir}`);
}

const files = fs.readdirSync(dir)
  .filter(name => name.endsWith('.test.cjs') && name.includes(filter))
  .sort()
  .map(name => path.join(dir, name));

if (!files.length) throw new Error('没有匹配测试，不能视为通过');

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
