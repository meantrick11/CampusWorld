const path = require('node:path');
const fs = require('node:fs');

/**
 * 本地 H5 预览的 vite 配置（不属于 HBuilderX 正式构建路线）。
 *
 * 结构与命名都按 uni-app CLI 的要求安排，依据来自插件源码：
 *
 * 1. 本目录必须同时含 package.json 与 index.html，且以本目录为工作目录运行。
 *    - vite-plugin-uni 通过「工作目录的 package.json」的依赖名加载平台插件集
 *      （dist/utils/plugin.js:92），缺依赖会导致 H5 插件集不注册，构建看似成功
 *      却不含任何页面。
 *    - vite 的 root 取工作目录，index.html 必须在其下。
 *    - CLI 默认读取「工作目录/vite.config.js」（dist/cli/utils.js:52）。
 *
 * 2. 应用源码目录由 UNI_INPUT_DIR 指向 apps/client，本目录内不放应用代码。
 *
 * 3. 需要自己补 JS 条件编译。vite-plugin-uni 只在
 *    `!runByHBuilderX() && UNI_PLATFORM === 'mp-weixin'` 时注册
 *    PreprocessorVitePlugin（dist/configResolved/plugins/index.js:39），
 *    因此 H5 下 .js 里的 `// #ifdef VUE3` 不生效，VUE2/VUE3 两分支同时保留会产生
 *    重复声明。这里用官方导出的 preJs 补上，读的是同一个预处理上下文。
 *
 * 4. 需要注入 uniCloud 占位。apps/client/common/appInit.js 在模块顶层执行
 *    `uniCloud.database()`，未关联服务空间时 H5 环境不存在 uniCloud，会抛
 *    `uniCloud is not defined` 导致页面无法挂载。占位不返回假数据，
 *    任何真实调用都会报「需要真实服务空间」。
 */

const inputDir = process.env.UNI_INPUT_DIR
	? path.resolve(process.env.UNI_INPUT_DIR)
	: path.resolve(__dirname, '../client');
const outputDir = process.env.UNI_OUTPUT_DIR
	? path.resolve(process.env.UNI_OUTPUT_DIR)
	: path.resolve(__dirname, '../../dist/h5');

process.env.UNI_INPUT_DIR = inputDir;
process.env.UNI_OUTPUT_DIR = outputDir;

const uniPlugin = require('@dcloudio/vite-plugin-uni');
const uni = uniPlugin.default || uniPlugin;
const { preJs } = require('@dcloudio/uni-cli-shared');

/** 对 .js/.ts 应用官方条件编译处理，覆盖 uni_modules 内的文件。 */
function uniJsPreprocess() {
	return {
		name: 'jirun:uni-js-preprocess',
		enforce: 'pre',
		transform(code, id) {
			const clean = id.split('?')[0];
			if (!/\.(js|ts)$/.test(clean)) return null;
			if (clean.includes('node_modules')) return null;
			const output = preJs(code, clean);
			return output === code ? null : { code: output, map: null };
		}
	};
}

/** 把预览用的 uniCloud 占位以 head-prepend 注入，确保先于应用模块执行。 */
function uniCloudPreviewShim() {
	const shimPath = path.resolve(__dirname, '../../preview/uniCloud-preview-shim.js');
	const shim = fs.readFileSync(shimPath, 'utf8');
	return {
		name: 'jirun:unicloud-preview-shim',
		transformIndexHtml() {
			return [
				{
					tag: 'script',
					attrs: { 'data-jirun-preview-shim': 'unicloud' },
					children: shim,
					injectTo: 'head-prepend'
				}
			];
		}
	};
}

module.exports = {
	/**
	 * 构建期常量：告诉应用这是预览构建、没有服务空间。
	 * 不能用「给 window.uniCloud 挂标记」的方式：项目含 uniCloud 模块，产物里带
	 * uni-app 的 uni-cloud 客户端运行时，它会在内联脚本之后把 window.uniCloud 整体替换掉，
	 * 标记会丢失（已实测）。构建期常量不受运行时替换影响。
	 */
	define: {
		__JIRUN_PREVIEW__: 'true'
	},
	plugins: [uniCloudPreviewShim(), uniJsPreprocess(), uni()]
};
