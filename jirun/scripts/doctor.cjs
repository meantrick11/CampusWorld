/**
 * 环境自检：只输出「已配置／缺失」，不打印任何凭据内容。
 * 退出码 0 表示关键项齐备；退出码 1 表示存在缺失（缺失不阻塞本地开发）。
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const clientDir = path.join(root, 'apps/client');
const adminDir = path.join(root, 'apps/admin');

const ok = [];
const missing = [];

function report(label, present, detail) {
  (present ? ok : missing).push({ label, detail: detail || '' });
}

function exists(p) {
  return fs.existsSync(p);
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

// 1. Node 兼容性：模板 engines 要求 HBuilderX，无 npm 依赖；此处只校验本机 Node 主版本
const nodeMajor = Number(process.versions.node.split('.')[0]);
report('Node.js >= 18', nodeMajor >= 18, `当前 v${process.versions.node}`);

// 2. 工程路径
report('apps/client 存在', exists(clientDir), 'uni-starter 用户端');
report('apps/admin 存在', exists(adminDir), 'uni-admin 管理端');
report('apps/client/manifest.json', exists(path.join(clientDir, 'manifest.json')));
report('apps/admin/manifest.json', exists(path.join(adminDir, 'manifest.json')));
report('根 package.json', exists(path.join(root, 'package.json')));

// 3. manifest 中 AppID 配置状态（只判断是否为空，不输出值）
function appidState(file) {
  const text = readText(file);
  if (!text) return { configured: false, detail: '未找到 manifest.json' };
  const values = [...text.matchAll(/"appid"\s*:\s*"([^"]*)"/g)].map(m => m[1]);
  if (!values.length) return { configured: false, detail: '无 appid 字段' };
  const filled = values.filter(v => v.trim() !== '').length;
  return {
    configured: filled === values.length,
    detail: filled === 0 ? '全部为空（待项目负责人填写）' : `${filled}/${values.length} 已填写`
  };
}
const clientAppid = appidState(path.join(clientDir, 'manifest.json'));
report('微信小程序 AppID', clientAppid.configured, clientAppid.detail);

// 4. uniCloud 服务空间绑定：HBuilderX 将绑定信息存放在项目内，若不存在则为缺失
const spaceHints = [
  path.join(clientDir, 'uniCloud-aliyun/.space'),
  path.join(root, '.local/space.json')
];
const spaceConfigured = spaceHints.some(exists);
report('uniCloud 开发服务空间', spaceConfigured, spaceConfigured ? '' : '未绑定（需在 HBuilderX 中关联）');

// 5. 本地凭据目录（密钥只允许放在被忽略的 .local/ 或云端配置）
const localDir = path.join(root, '.local');
report('.local/ 凭据目录', exists(localDir), exists(localDir) ? '已建立（内容被忽略）' : '未建立');

// 6. 官方模块就位情况
report(
  'uni-id-pages',
  exists(path.join(clientDir, 'uni_modules/uni-id-pages')),
  '账号与登录'
);
report(
  'uni-im',
  exists(path.join(clientDir, 'uni_modules/uni-im')),
  '仅为 DCloud 插件市场分发，需负责人手工安装'
);

// 7. 本机工具可用性
function findTool(candidates, commands) {
  for (const c of candidates) {
    if (c && exists(c)) return c;
  }
  for (const cmd of commands) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
      encoding: 'utf8',
      shell: false
    });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

const hbuilderx = findTool(
  [
    'C:/Program Files/HBuilderX/cli.exe',
    'C:/HBuilderX/cli.exe',
    'D:/HBuilderX/cli.exe',
    'D:/develop/HBuilderX/cli.exe'
  ],
  ['HBuilderX', 'hbuilderx', 'cli']
);
report('HBuilderX（小程序编译／云函数上传）', Boolean(hbuilderx), hbuilderx ? `路径已定位` : '未安装');

const wxdev = findTool(
  [
    'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat',
    'C:/Program Files/Tencent/微信web开发者工具/cli.bat'
  ],
  ['cli.bat']
);
report('微信开发者工具', Boolean(wxdev), wxdev ? '路径已定位' : '未安装');

// 输出
const line = (item, mark) => `  ${mark} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`;
console.log('暨快跑 环境自检（不输出任何凭据）');
console.log(`\n已配置 ${ok.length} 项：`);
ok.forEach(i => console.log(line(i, '[✓]')));
console.log(`\n缺失 ${missing.length} 项：`);
missing.forEach(i => console.log(line(i, '[✗]')));
console.log(
  '\n说明：缺失项不阻塞本地规则与页面开发，但相关任务不能标记为「真实联调通过」。'
);

process.exit(missing.length ? 1 : 0);
