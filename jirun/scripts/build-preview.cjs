'use strict';

/**
 * 本地 H5 预览构建入口。
 *
 * 必须显式把工作目录切到 apps/client-preview 再启动 uni CLI，原因是
 * vite-plugin-uni 的两处行为都取决于「当前工作目录」：
 *   - 用「工作目录/package.json」的依赖名加载平台插件集
 *     （dist/utils/plugin.js:92 resolvePluginsByCliRoot）
 *   - 用「工作目录/vite.config.js」作为配置（dist/cli/utils.js:52）
 * 用 `npm --prefix` 不会改变脚本的工作目录，因此这里自行切换。
 *
 * 产物输出到 jirun/dist/h5（被 .gitignore 忽略），不用于发布。
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const previewDir = path.resolve(__dirname, '../apps/client-preview');
const uniBin = path.join(previewDir, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js');

if (!fs.existsSync(uniBin)) {
	console.error(`未找到 uni CLI：${uniBin}`);
	console.error('请先在 apps/client-preview 目录执行 npm install');
	process.exit(1);
}

const result = spawnSync(process.execPath, [uniBin, 'build', '-p', 'h5'], {
	cwd: previewDir,
	stdio: 'inherit',
	env: {
		...process.env,
		UNI_INPUT_DIR: path.resolve(previewDir, '../client'),
		UNI_OUTPUT_DIR: path.resolve(__dirname, '../dist/h5')
	}
});

if (result.error) throw result.error;
process.exit(result.status === null ? 1 : result.status);
