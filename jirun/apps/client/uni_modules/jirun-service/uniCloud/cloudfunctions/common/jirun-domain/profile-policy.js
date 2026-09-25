'use strict';

/**
 * 昵称与头像的七天冷却规则（contracts.md 第 2 节）。
 *
 * 昵称与头像各自使用独立的时间字段（nicknameLastChangedAt / avatarLastChangedAt），
 * 因此本函数只接收单个字段的修改时间，两个字段不会相互影响。
 * 首次修改不消耗机会：没有修改记录时直接允许。
 *
 * now 必须由服务端传入服务端时间，函数不自行取本机时间；
 * 已有修改记录但缺少可信时间时默认拒绝，避免用客户端时间绕过冷却。
 */

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {object} input
 * @param {number} input.now 服务端当前时间（Unix 毫秒）
 * @param {number|null|undefined} input.lastChangedAt 该字段上次修改时间
 * @returns {boolean} 是否允许修改
 */
function canEditField(input) {
	const { now, lastChangedAt } = input || {};

	const neverChanged = lastChangedAt === null || lastChangedAt === undefined || lastChangedAt === 0;
	if (neverChanged) return true;

	if (!Number.isFinite(now) || !Number.isFinite(lastChangedAt)) return false;

	return now - lastChangedAt >= COOLDOWN_MS;
}

module.exports = {
	canEditField,
	COOLDOWN_MS
};
