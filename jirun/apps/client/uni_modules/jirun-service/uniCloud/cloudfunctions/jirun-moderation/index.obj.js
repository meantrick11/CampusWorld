'use strict';

/**
 * jirun-moderation 云对象：举报提交、本人案件、复核申请。
 *
 * 举报与复核是用户侧动作，审核决定在 jirun-admin 中。
 * 业务规则全部在 common/jirun-domain/moderation-*.js 中实现并有测试覆盖。
 *
 * ⚠️ 真实云端状态：治理仓储（./repository.js）尚未完成，在真实服务空间中调用
 * 会返回 DEPENDENCY_UNAVAILABLE。原因与实现指引见该文件头部。
 */

const uniID = require('uni-id-common');
const { createModerationService, ok, failure, toActor } = require('jirun-domain');
const { createUniCloudModerationRepository } = require('./repository.js');

let service = null;

function getService() {
	if (!service) {
		service = createModerationService({
			repository: createUniCloudModerationRepository(),
			clock: () => Date.now()
		});
	}
	return service;
}

async function resolveActor() {
	const token = this.getUniIdToken();
	if (!token) return null;
	const tokenResult = await uniID.createInstance({ clientInfo: this.getClientInfo() }).checkToken(token);
	if (!tokenResult || tokenResult.errCode) return null;
	return toActor(tokenResult);
}

function handle(method) {
	return async function handled(params = {}) {
		try {
			const actor = await resolveActor.call(this);
			return ok(await getService()[method](actor, params));
		} catch (error) {
			console.error(`[jirun-moderation] ${method} 失败`, error);
			return failure(error);
		}
	};
}

module.exports = {
	submitReport: handle('submitReport'),
	listMyCases: handle('listMyCases'),
	appeal: handle('appeal')
};
