'use strict';

/**
 * 内容公开可见性规则（contracts.md 第 4 节）。
 *
 * 公开接口只有在「根内容未下架／未删除」且「指向的版本已通过审核」时才返回内容。
 * 有新待审版本时不得泄漏待审正文，因此 visibility 与 revisionStatus 必须同时满足。
 */

const VISIBILITY = {
	DRAFT: 'draft',
	PENDING: 'pending',
	PUBLISHED: 'published',
	REJECTED: 'rejected',
	REMOVED: 'removed',
	DELETED: 'deleted'
};

const REVISION_STATUS = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected'
};

/**
 * @param {object} input
 * @param {string} input.visibility 根内容可见性
 * @param {string} input.revisionStatus 当前公开版本的审核状态
 * @returns {boolean} 是否允许公开读取
 */
function canReadPublic(input) {
	if (!input || typeof input !== 'object') return false;
	return input.visibility === VISIBILITY.PUBLISHED && input.revisionStatus === REVISION_STATUS.APPROVED;
}

module.exports = {
	canReadPublic,
	VISIBILITY,
	REVISION_STATUS
};
