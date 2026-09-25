'use strict';

/**
 * 业务集合客户端权限判定。
 *
 * 抽成独立模块是为了能用合成数据测试：验证「权限被放开时必须报错」这件事，
 * 不需要去改真实的 schema 文件（那样本身就是一次危险操作）。
 */

const ACTIONS = ['read', 'create', 'update', 'delete'];

/**
 * 检查一个业务集合 schema 是否禁止客户端直接访问。
 * @param {object} schema 已解析的 schema 对象
 * @param {string} label 位置标识，用于错误信息
 * @returns {string[]} 问题列表，空数组表示通过
 */
function findPermissionViolations(schema, label) {
	const problems = [];
	if (!schema || typeof schema !== 'object') {
		problems.push(`${label}：schema 内容不是对象`);
		return problems;
	}
	const permission = schema.permission;
	if (!permission || typeof permission !== 'object') {
		problems.push(`${label}：缺少 permission 声明，无法确认客户端访问被拒绝`);
		return problems;
	}
	for (const action of ACTIONS) {
		if (permission[action] !== false) {
			problems.push(
				`${label}：permission.${action} 不是 false（实际为 ${JSON.stringify(permission[action])}），客户端可能绕过云对象直接访问`
			);
		}
	}
	return problems;
}

/** 只有 jr_ 前缀的集合属于本项目自有业务集合，需要强制禁止客户端访问。 */
const isBusinessCollection = (fileName) => fileName.startsWith('jr_');

module.exports = { findPermissionViolations, isBusinessCollection, ACTIONS };
