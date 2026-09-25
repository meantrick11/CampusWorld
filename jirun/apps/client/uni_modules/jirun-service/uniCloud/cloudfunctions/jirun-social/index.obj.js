'use strict';

/**
 * jirun-social 云对象：校园墙六项互动中的点赞、评论、回复、收藏、关注。
 * 分享不改变服务端状态，由页面调用微信分享接口，重新访问时仍按可见性校验。
 *
 * 职责边界：本文件只做「服务端身份解析 → 调用已测试的业务服务 → 套用统一返回」。
 * 业务规则全部在 common/jirun-domain/social-*.js 中实现并有测试覆盖。
 *
 * ⚠️ 真实云端状态：互动仓储（./repository.js）尚未完成，在真实服务空间中调用
 * 会返回 DEPENDENCY_UNAVAILABLE。原因与实现指引见该文件头部。
 */

const uniID = require('uni-id-common');
const { createSocialService, ok, failure, toActor } = require('jirun-domain');
const { createUniCloudSocialRepository } = require('./repository.js');

let service = null;

function getService() {
	if (!service) {
		service = createSocialService({
			repository: createUniCloudSocialRepository(),
			clock: () => Date.now()
		});
	}
	return service;
}

/** 由服务端 token 解析当前用户；未登录返回 null（评论列表允许游客读取）。 */
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
			console.error(`[jirun-social] ${method} 失败`, error);
			return failure(error);
		}
	};
}

module.exports = {
	setReaction: handle('setReaction'),
	setFollow: handle('setFollow'),
	submitComment: handle('submitComment'),
	listComments: handle('listComments'),
	deleteOwnComment: handle('deleteOwnComment'),
	listFavorites: handle('listFavorites'),
	listFollowing: handle('listFollowing'),
	getProfileState: handle('getProfileState'),
	getInteractionSummary: handle('getInteractionSummary')
};
