'use strict';

/**
 * jirun-content 云对象：内容发布、编辑、查询、状态维护。
 *
 * 职责边界：
 * - 本文件只做「服务端身份解析 → 调用已测试的业务服务 → 套用统一返回」。
 * - 业务规则全部在 common/jirun-domain 中实现并有单元测试覆盖。
 * - 当前用户由 token 校验得出，不接受客户端传入的 userId 或 isAdmin。
 *
 * ⚠️ 真实云端状态：仓储实现（./repository.js）尚未完成，因此在真实服务空间中
 * 调用本云对象会返回 DEPENDENCY_UNAVAILABLE。原因与实现指引见该文件头部。
 */

const uniID = require('uni-id-common');
const { createContentService, ok, failure, toActor } = require('jirun-domain');
const { createUniCloudContentRepository } = require('./repository.js');

let service = null;

function getService() {
	if (!service) {
		service = createContentService({
			repository: createUniCloudContentRepository(),
			clock: () => Date.now()
		});
	}
	return service;
}

/** 由服务端 token 解析当前用户；未登录返回 null（访客可读公开内容）。 */
async function resolveActor() {
	const token = this.getUniIdToken();
	if (!token) return null;
	const tokenResult = await uniID.createInstance({ clientInfo: this.getClientInfo() }).checkToken(token);
	if (!tokenResult || tokenResult.errCode) return null;
	return toActor(tokenResult);
}

/** 统一处理：解析身份 → 调服务 → 包统一返回；异常细节只写服务端日志。 */
function handle(method) {
	return async function handled(params = {}) {
		try {
			const actor = await resolveActor.call(this);
			return ok(await getService()[method](actor, params));
		} catch (error) {
			console.error(`[jirun-content] ${method} 失败`, error);
			return failure(error);
		}
	};
}

module.exports = {
	submitContent: handle('submitContent'),
	editContent: handle('editContent'),
	listPublic: handle('listPublic'),
	getPublic: handle('getPublic'),
	listMine: handle('listMine'),
	updateStatus: handle('updateStatus'),
	deleteContent: handle('deleteContent')
};
