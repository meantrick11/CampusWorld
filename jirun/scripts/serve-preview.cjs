'use strict';

/**
 * 本地静态服务器，仅用于查看 H5 预览产物（jirun/dist/h5）。
 * 它不是交付物的一部分，也不参与发布；用 Node 内置模块实现以避免额外依赖。
 *
 * 用法：node scripts/serve-preview.cjs [端口]
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../dist/h5');
const port = Number(process.argv[2]) || 5180;

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
	console.error('请先执行 npm run preview:h5（在 apps/client 目录下运行）');
	process.exit(1);
}

const server = http.createServer((request, response) => {
	const urlPath = decodeURIComponent(request.url.split('?')[0]);
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
	console.log(`H5 预览地址： http://127.0.0.1:${port}/`);
	console.log('查看完可停止本进程；本服务不对外网开放。');
});
