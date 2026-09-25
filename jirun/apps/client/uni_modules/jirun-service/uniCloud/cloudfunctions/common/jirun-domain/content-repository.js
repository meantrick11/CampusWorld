'use strict';

/**
 * 内容仓储契约。
 *
 * content-service.js 只依赖下面这些方法，不直接访问数据库，因此业务规则可以在
 * Node 下用内存仓储真实运行；云端实现（uniCloud 集合）只需满足同一契约。
 *
 * ## 必须由实现保证的语义
 *
 * 1. **版本比较写入**：`saveWithVersion(root, expectedVersion)` 是与数据库条件更新
 *    等价的原子操作。当前版本不等于 `expectedVersion` 时必须拒绝，绝不能覆盖
 *    他人修改。
 * 2. **新建原子性**：`createContentWithRevision({root, revision})` 必须把根内容与
 *    首个版本一起写入并回填版本的 `contentId`，不允许出现孤立版本。
 * 3. **requestId 唯一性**：`reserveRequest` 等价于唯一索引插入。同一 (actorId,
 *    requestId) 只能成功预留一次；已预留未完成时返回 `{ ok:false, inFlight:true }`，
 *    并发重复预留必须被拒绝。业务失败时调用方会用 `releaseRequest` 释放。
 * 4. **读出的对象不可被外部修改影响存储**：实现需返回副本或等价隔离。
 * 5. **列表返回已解析行**：`listPublic` / `listMine` 的 `items` 是
 *    `{ root, published, latest }`，服务端据此一次构建 DTO，避免逐条补查版本。
 * 6. **游标稳定**：`nextCursor` 为不透明字符串；排序键必须唯一且稳定
 *    （本项目的实现为 createdAt 倒序 + id 倒序）。到末页返回 `null`。
 */

const REQUIRED_METHODS = [
	'getById',
	'getRevision',
	'getLatestRevision',
	'getPublishedRevision',
	'createContentWithRevision',
	'createRevision',
	'saveRevisionStatus',
	'saveWithVersion',
	'listPublic',
	'listMine',
	'reserveRequest',
	'completeRequest',
	'releaseRequest',
	'appendDecision',
	'appendAuditLog'
];

/**
 * 快速检查仓储是否满足契约。缺少方法时立即报错，
 * 避免上线后才发现 mock 与真实实现行为不一致。
 */
function assertRepository(repository) {
	if (!repository || typeof repository !== 'object') {
		throw new TypeError('createContentService 需要传入仓储实现');
	}
	const missing = REQUIRED_METHODS.filter((name) => typeof repository[name] !== 'function');
	if (missing.length) {
		throw new TypeError(`仓储缺少契约要求的方法：${missing.join('、')}`);
	}
	return repository;
}

module.exports = {
	assertRepository,
	REQUIRED_METHODS
};
