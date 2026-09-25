'use strict';

/**
 * 当前用户与审核权限的判定规则。
 *
 * 安全要求：actor 只能由服务端 token 校验结果构造。客户端传入的
 * userId、isAdmin、role 等字段一律不参与判定。本模块只做纯判定，
 * 传入值必须来自 uni-id-common 的 checkToken 结果。
 */

/** uni-id 中代表管理员的角色 _id。 */
const REVIEW_ROLE_IDS = ['admin'];

/** 也可以按权限点授予审核能力，便于后续细分。 */
const REVIEW_PERMISSIONS = ['jirun-content:review', 'jirun-admin'];

const toArray = (value) => {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null || value === '') return [];
	return [value];
};

/**
 * @param {object} tokenResult 服务端 token 校验结果
 * @param {string[]|string} [tokenResult.role]
 * @param {string[]|string} [tokenResult.permission]
 * @returns {boolean}
 */
function isReviewer(tokenResult) {
	if (!tokenResult || typeof tokenResult !== 'object') return false;
	const roles = toArray(tokenResult.role);
	const permissions = toArray(tokenResult.permission);
	return (
		roles.some((item) => REVIEW_ROLE_IDS.includes(item)) ||
		permissions.some((item) => REVIEW_PERMISSIONS.includes(item))
	);
}

/**
 * 由 token 校验结果构造服务端 actor。未登录返回 null。
 * @returns {{userId: string, isReviewer: boolean}|null}
 */
function toActor(tokenResult) {
	if (!tokenResult || typeof tokenResult.uid !== 'string' || tokenResult.uid === '') return null;
	return { userId: tokenResult.uid, isReviewer: isReviewer(tokenResult) };
}

module.exports = {
	isReviewer,
	toActor,
	REVIEW_ROLE_IDS,
	REVIEW_PERMISSIONS
};
