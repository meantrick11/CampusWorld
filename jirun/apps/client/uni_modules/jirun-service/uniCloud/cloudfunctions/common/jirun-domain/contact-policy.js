'use strict';

/**
 * 私聊发送权限规则（contracts.md 第 6 节）。
 * 纯函数，不访问数据库、不读取时间，因此可在 Node 下直接测试。
 * 服务端最终以本函数的判定结果为准，页面上的禁用只是提示。
 */

const CONTACT_STATES = {
	NONE: 'none',
	PENDING: 'pending',
	ACTIVE: 'active'
};

const SEND_REASONS = {
	AUTH_REQUIRED: 'AUTH_REQUIRED',
	BLOCKED: 'BLOCKED',
	WAITING_REPLY: 'WAITING_REPLY',
	INVALID_INPUT: 'INVALID_INPUT'
};

const deny = (reason) => ({ allowed: false, reason });
const allow = () => ({ allowed: true, reason: null });

/**
 * @param {object} input
 * @param {'none'|'pending'|'active'} input.state 账号对的联系状态
 * @param {string} input.actorId 当前用户，必须来自服务端 token 校验
 * @param {string|null} input.initiatorId 首个有效发送者
 * @param {boolean} input.blocked 任一方拉黑即为 true
 * @returns {{allowed: boolean, reason: string|null}}
 */
function canSend(input) {
	const { state, actorId, initiatorId, blocked } = input || {};

	// 身份缺失不能放行，避免用前端传入的 userId 代替当前用户
	if (typeof actorId !== 'string' || actorId === '') {
		return deny(SEND_REASONS.AUTH_REQUIRED);
	}

	// 拉黑优先于一切，包括已经开放的会话
	if (blocked === true) {
		return deny(SEND_REASONS.BLOCKED);
	}

	switch (state) {
		case CONTACT_STATES.NONE:
			// 尚无联系记录：允许发出第一条，由服务端记录发起者
			return allow();
		case CONTACT_STATES.PENDING:
			// 对方未回复前，发起者只能有一条已接受消息；对方可回复
			return actorId === initiatorId ? deny(SEND_REASONS.WAITING_REPLY) : allow();
		case CONTACT_STATES.ACTIVE:
			return allow();
		default:
			// 未识别的状态不放行
			return deny(SEND_REASONS.INVALID_INPUT);
	}
}

module.exports = {
	canSend,
	CONTACT_STATES,
	SEND_REASONS
};
