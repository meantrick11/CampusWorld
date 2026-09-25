'use strict';

/**
 * 本地静态服务器，仅用于查看 H5 预览产物。
 * 它不是交付物的一部分，也不参与发布；用 Node 内置模块实现以避免额外依赖。
 *
 * 用法：node scripts/serve-preview.cjs [client|admin] [端口]
 *   client（默认）→ jirun/dist/h5        用户端
 *   admin         → jirun/dist/h5-admin  管理端
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const target = args.find((value) => !/^\d+$/.test(value)) || 'client';
if (!['client', 'admin'].includes(target)) {
	console.error(`不支持的目标：${target}（只支持 client 或 admin）`);
	process.exit(1);
}
const port = Number(args.find((value) => /^\d+$/.test(value))) || (target === 'admin' ? 5181 : 5180);
const root = path.resolve(__dirname, target === 'admin' ? '../dist/h5-admin' : '../dist/h5');

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ico': 'image/x-icon'
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
	console.error(`未找到预览产物：${root}/index.html`);
	console.error('请先执行 npm run preview:build（管理端用 npm run preview:build:admin）');
	process.exit(1);
}

// uni-admin 的 manifest 把 h5.router.base 设为 /admin/，因此管理端资源请求带该前缀。
// 预览时把前缀去掉再映射到产物目录，与真实部署的子路径一致。
const BASE_PREFIX = target === 'admin' ? '/admin' : '';

const server = http.createServer((request, response) => {
	let urlPath = decodeURIComponent(request.url.split('?')[0]);
	if (BASE_PREFIX && urlPath.startsWith(BASE_PREFIX)) {
		urlPath = urlPath.slice(BASE_PREFIX.length) || '/';
	}
	let filePath = path.join(root, urlPath);

	// 阻止越出产物目录
	if (!filePath.startsWith(root)) {
		response.writeHead(403).end('Forbidden');
		return;
	}

	if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
		// 单页应用回退
		filePath = path.join(root, 'index.html');
	}

	const body = fs.readFileSync(filePath);
	response.writeHead(200, {
		'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
		'Cache-Control': 'no-store'
	});
	response.end(body);
});

server.listen(port, '127.0.0.1', () => {
	console.log(`${target} 预览地址： http://127.0.0.1:${port}/`);
	console.log('查看完可停止本进程；本服务不对外网开放。');
});
