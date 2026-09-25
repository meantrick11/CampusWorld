'use strict';

/**
 * jirun-admin 云对象：管理端操作入口。
 *
 * T04 只实现内容审核的最小分支（approve / reject），供真实发布流程验证使用；
 * 举报、复核、账号限制、配置与概览在 T09 扩展。
 *
 * 权限：审核能力由服务端 token 的角色或权限点得出（见 jirun-domain/actor-policy.js），
 * 普通用户调用会被拒绝，客户端无法通过传参获得审核身份。
 */

const uniID = require('uni-id-common');
const { createContentService, ok, failure, toActor } = require('jirun-domain');
const { createUniCloudContentRepository } = require('../jirun-content/repository.js');

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

async function resolveActor() {
	const token = this.getUniIdToken();
	if (!token) return null;
	const tokenResult = await uniID.createInstance({ clientInfo: this.getClientInfo() }).checkToken(token);
	if (!tokenResult || tokenResult.errCode) return null;
	return toActor(tokenResult);
}

module.exports = {
	/** contracts.md：decide({ targetType, targetId, expectedVersion, action, reason, requestId }) */
	async decide(params = {}) {
		try {
			if (params.targetType !== 'content') {
				const error = new Error('当前只支持内容审核，举报与复核将在治理任务中实现');
				error.code = 'INVALID_INPUT';
				throw error;
			}
			const actor = await resolveActor.call(this);
			return ok(await getService().decideContent(actor, params));
		} catch (error) {
			console.error('[jirun-admin] decide 失败', error);
			return failure(error);
		}
	}
};
