/**
 * 静态一致性校验：在没有 HBuilderX／微信开发者工具的环境下，
 * 用可复现的方式确认页面注册、tabBar 资源与 uni_modules 引用没有悬空。
 * 它不替代真实编译，只用于发现「删了页面但引用还在」这类错误。
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

/** 去掉 JSON 中的注释与尾逗号，同时保留字符串内部内容（含 URL）。 */
function tolerantJson(text) {
  let out = '';
  let inString = false;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += next;
        i++;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function pageFileExists(appDir, pagePath) {
  return ['.vue', '.nvue'].some(ext => fs.existsSync(path.join(appDir, pagePath + ext)));
}

const problems = [];
const notes = [];

function checkApp(appDir, label) {
  const pagesJsonPath = path.join(appDir, 'pages.json');
  if (!fs.existsSync(pagesJsonPath)) {
    problems.push(`[${label}] 缺少 pages.json`);
    return;
  }
  const pagesJson = JSON.parse(tolerantJson(fs.readFileSync(pagesJsonPath, 'utf8')));

  const registered = new Set();
  for (const p of pagesJson.pages || []) registered.add('/' + p.path);
  for (const sp of pagesJson.subPackages || []) {
    for (const p of sp.pages || []) registered.add('/' + path.posix.join(sp.root, p.path));
  }

  // 1. 注册页面文件存在
  for (const p of pagesJson.pages || []) {
    if (!pageFileExists(appDir, p.path)) problems.push(`[${label}] pages.json 注册但文件缺失：${p.path}`);
  }
  for (const sp of pagesJson.subPackages || []) {
    for (const p of sp.pages || []) {
      const full = path.posix.join(sp.root, p.path);
      if (!pageFileExists(appDir, full)) {
        problems.push(`[${label}] 分包注册但文件缺失：${full}`);
      }
    }
  }

  // 2. tabBar 页面与图标存在
  for (const tab of (pagesJson.tabBar && pagesJson.tabBar.list) || []) {
    if (!registered.has('/' + tab.pagePath)) {
      problems.push(`[${label}] tabBar 指向未注册页面：${tab.pagePath}`);
    }
    if (!pageFileExists(appDir, tab.pagePath)) {
      problems.push(`[${label}] tabBar 页面文件缺失：${tab.pagePath}`);
    }
    for (const key of ['iconPath', 'selectedIconPath']) {
      if (tab[key] && !fs.existsSync(path.join(appDir, tab[key]))) {
        problems.push(`[${label}] tabBar 图标缺失：${tab[key]}`);
      }
    }
  }

  // 3. uni_modules 引用可解析
  const moduleRef = /uni_modules\/([A-Za-z0-9._-]+)/g;
  const seen = new Map();
  for (const file of walk(appDir)) {
    if (!/\.(vue|js|json|css|scss|ts)$/.test(file)) continue;
    const rel = path.relative(appDir, file).replace(/\\/g, '/');
    if (rel.startsWith('uni_modules/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(moduleRef)) {
      const name = m[1];
      if (!seen.has(name)) seen.set(name, rel);
    }
  }
  for (const [name, where] of seen) {
    if (!fs.existsSync(path.join(appDir, 'uni_modules', name))) {
      problems.push(`[${label}] 引用了不存在的模块 uni_modules/${name}（首次出现于 ${where}）`);
    }
  }
  notes.push(`[${label}] 注册页面 ${registered.size} 个，引用 uni_modules 模块 ${seen.size} 个`);

  // 4. 管理端菜单 URL 必须落在已注册页面内（仅 admin 承载这些页面）
  const menuPath = path.join(appDir, 'uniCloud-aliyun/database/opendb-admin-menus.init_data.json');
  if (label === 'admin' && fs.existsSync(menuPath)) {
    const rows = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    for (const row of rows) {
      const url = row.url;
      if (!url || url === '/') continue;
      const clean = url.split('?')[0];
      if (!registered.has(clean)) {
        problems.push(`[${label}] 菜单「${row.name}」指向未注册页面：${url}`);
      }
    }
    notes.push(`[${label}] 菜单条目 ${rows.length} 条，全部指向已注册页面或目录`);
  }
}

checkApp(path.join(root, 'apps/client'), 'client');
checkApp(path.join(root, 'apps/admin'), 'admin');

console.log('页面与引用一致性检查');
notes.forEach(n => console.log('  · ' + n));
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题：`);
  problems.forEach(p => console.log('  [✗] ' + p));
  process.exit(1);
}
console.log('\n[✓] 未发现悬空引用');
