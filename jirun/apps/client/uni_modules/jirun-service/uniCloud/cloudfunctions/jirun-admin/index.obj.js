'use strict';

/**
 * jirun-admin 云对象：管理端操作入口。
 *
 * 覆盖内容／评论／举报／复核的审核决定、账号限制、配置与概览。
 * 媒体审核与媒体下架属媒体任务，当前返回明确的不可用提示。
 *
 * 权限：审核能力由服务端 token 的角色或权限点得出（见 jirun-domain/actor-policy.js），
 * 普通用户调用会被拒绝，客户端无法通过传参获得审核身份。
 * 本云对象不提供浏览他人私聊的能力。
 *
 * ⚠️ 真实云端状态：治理仓储尚未完成，在真实服务空间中调用会返回
 * DEPENDENCY_UNAVAILABLE。原因与实现指引见 ../jirun-moderation/repository.js。
 */

const uniID = require('uni-id-common');
const { createModerationService, ok, failure, toActor } = require('jirun-domain');
const { createUniCloudModerationRepository } = require('../jirun-moderation/repository.js');

let moderationService = null;

function getService() {
	if (!moderationService) {
		moderationService = createModerationService({
			// 内容审核与治理共用同一套仓储契约：审核决定既要动内容也要留痕
			repository: createUniCloudModerationRepository(),
			clock: () => Date.now()
		});
	}
	return moderationService;
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
			console.error(`[jirun-admin] ${method} 失败`, error);
			return failure(error);
		}
	};
}

module.exports = {
	// 审核决定：内容、评论、举报、复核
	decide: handle('decide'),
	listQueue: handle('listQueue'),
	// 账号限制：人工限制发布／私聊及解除，均需原因并留痕
	restrictUser: handle('restrictUser'),
	listRestrictions: handle('listRestrictions'),
	isRestricted: handle('isRestricted'),
	// 配置：分类、区域、容量等；不允许出现付费能力开关
	updateConfig: handle('updateConfig'),
	listConfig: handle('listConfig'),
	// 概览：只统计发布与审核积压，无交易流水
	getMetrics: handle('getMetrics')
};
