const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const { createContentService } = require(path.join(DOMAIN, 'content-service.js'));
const { createMemoryContentRepository } = require('../support/memory-content-repository.cjs');

// contracts.md 第 4、5 节：公开查询只返回已发布且通过的版本；写请求按调用者与
// requestId 去重；编辑携带 expectedVersion 防止覆盖；状态变更与资金无关。

const AUTHOR = { userId: 'A' };
const OTHER = { userId: 'B' };
const REVIEWER = { userId: 'R', isReviewer: true };
const GUEST = null;

const setNow = (() => {
	let value = 1000;
	return {
		clock: () => value,
		advance(ms) {
			value += ms;
		},
		reset() {
			value = 1000;
		}
	};
})();

function setup() {
	setNow.reset();
	const repository = createMemoryContentRepository();
	const service = createContentService({ repository, clock: setNow.clock });
	return { repository, service };
}

const validDelivery = () => ({
	kind: 'delivery',
	title: '代取快递到三号宿舍楼',
	body: '下午可取，快件放在菜鸟驿站。',
	mediaIds: [],
	mediaTypes: [],
	details: {
		category: '快递代取',
		size: '小件',
		pieces: 1,
		fromRegion: '菜鸟驿站',
		toRegion: '三号宿舍楼',
		timeNote: '今天 18:00 前',
		rewardType: 'negotiable'
	}
});

const validIdle = () => ({
	kind: 'idle',
	title: '转手九成新台灯',
	body: '闲置转让，可在宿舍楼下自取。',
	mediaIds: [],
	mediaTypes: [],
	details: {
		category: '生活用品',
		remainingQuantity: 2,
		priceType: 'free',
		handoverRegion: '五号宿舍楼下'
	}
});

const validWanted = () => ({
	kind: 'wanted',
	title: '求购二手自行车',
	body: '希望车况能正常骑行。',
	mediaIds: [],
	mediaTypes: [],
	details: { category: '交通工具', neededQuantity: 1, budgetType: 'negotiable' }
});

const validWall = () => ({
	kind: 'wall',
	title: '',
	body: '今晚操场有社团招新。',
	mediaIds: [],
	mediaTypes: [],
	details: { mediaForm: 'text', topic: '社团' }
});

// ---------- 越权：他人不能变更他人内容 ----------

test('他人不能将信息标记完成', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	await assert.rejects(
		service.updateStatus({ userId: 'B' }, { id: 'c1', expectedVersion: 1, status: 'completed', requestId: 'r1' }),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('他人不能编辑他人信息', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', ...validIdle() });
	await assert.rejects(
		service.editContent({ userId: 'B' }, {
			id: 'c1', expectedVersion: 1, title: '被改标题', body: '被改正文', requestId: 'r1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('他人不能删除他人信息', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A' });
	await assert.rejects(
		service.deleteContent({ userId: 'B' }, { id: 'c1', expectedVersion: 1, requestId: 'r1' }),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('未登录不能发布', async () => {
	const { service } = setup();
	await assert.rejects(
		service.submitContent(GUEST, { ...validIdle(), requestId: 'r1' }),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

// ---------- 版本冲突 ----------

test('旧 expectedVersion 更新状态时冲突', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	await assert.rejects(
		service.updateStatus(AUTHOR, {
			id: 'c1', expectedVersion: 9, status: 'completed', requestId: 'r1'
		}),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('旧 expectedVersion 删除时冲突', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A' });
	await assert.rejects(
		service.deleteContent(AUTHOR, { id: 'c1', expectedVersion: 9, requestId: 'r1' }),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('作者更新成功后版本号递增', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	const result = await service.updateStatus(AUTHOR, {
		id: 'c1', expectedVersion: 1, status: 'contacted', requestId: 'r1'
	});
	assert.equal(result.version, 2);
	assert.equal(result.businessStatus, 'contacted');
});

// ---------- 状态白名单与资金无关 ----------

test('状态为空时拒绝', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	await assert.rejects(
		service.updateStatus(AUTHOR, { id: 'c1', expectedVersion: 1, status: '', requestId: 'r1' }),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('取送不能使用不属于它的状态', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	await assert.rejects(
		service.updateStatus(AUTHOR, { id: 'c1', expectedVersion: 1, status: 'available', requestId: 'r1' }),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('已结束的取送不能回到进行中', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'completed' });
	await assert.rejects(
		service.updateStatus(AUTHOR, { id: 'c1', expectedVersion: 1, status: 'seeking', requestId: 'r1' }),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('校园墙没有业务状态，不接受状态变更', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'wall', businessStatus: null });
	await assert.rejects(
		service.updateStatus(AUTHOR, { id: 'c1', expectedVersion: 1, status: 'closed', requestId: 'r1' }),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('状态变更结果只包含状态与版本，不产生资金字段', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'idle', businessStatus: 'available' });
	const result = await service.updateStatus(AUTHOR, {
		id: 'c1', expectedVersion: 1, status: 'sold', requestId: 'r1'
	});
	assert.deepEqual(Object.keys(result).sort(), ['businessStatus', 'id', 'version']);
});

// ---------- 数量归零退出有效列表 ----------

test('闲置数量归零后退出公开列表，且不伪造成交', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', ...validIdle(), businessStatus: 'available' });
	const before = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(before.items.length, 1);

	const result = await service.updateStatus(AUTHOR, {
		id: 'c1', expectedVersion: 1, remainingQuantity: 0, requestId: 'r1'
	});
	assert.equal(result.businessStatus, 'closed');

	const after = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(after.items.length, 0);
});

test('闲置数量减少但仍大于零时仍在公开列表', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', ...validIdle(), businessStatus: 'available' });
	await service.updateStatus(AUTHOR, { id: 'c1', expectedVersion: 1, remainingQuantity: 1, requestId: 'r1' });
	const after = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(after.items.length, 1);
});

// ---------- 幂等 ----------

test('重复提交同一 requestId 只生成一条内容并返回同一结果', async () => {
	const { repository, service } = setup();
	const input = { ...validIdle(), requestId: 'same-key' };
	const first = await service.submitContent(AUTHOR, input);
	const second = await service.submitContent(AUTHOR, input);

	assert.deepEqual(second, first);
	assert.equal(repository.countRoots(), 1);
	assert.equal(repository.countRevisions(), 1);
});

test('不同 requestId 提交相同内容会生成两条内容', async () => {
	const { repository, service } = setup();
	await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'key-1' });
	await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'key-2' });
	assert.equal(repository.countRoots(), 2);
});

test('并发提交同一 requestId 只生成一条内容', async () => {
	const { repository, service } = setup();
	const input = { ...validIdle(), requestId: 'race-key' };
	const results = await Promise.allSettled([
		service.submitContent(AUTHOR, input),
		service.submitContent(AUTHOR, input)
	]);
	assert.equal(repository.countRoots(), 1);

	const fulfilled = results.filter((item) => item.status === 'fulfilled');
	const rejected = results.filter((item) => item.status === 'rejected');
	assert.equal(fulfilled.length, 1);
	assert.equal(rejected.length, 1);
	assert.equal(rejected[0].reason.code, 'DEPENDENCY_UNAVAILABLE');
});

test('业务失败会释放 requestId，不永久占用', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', kind: 'delivery', businessStatus: 'seeking' });
	await assert.rejects(
		service.updateStatus(OTHER, { id: 'c1', expectedVersion: 1, status: 'completed', requestId: 'reuse' }),
		(error) => error.code === 'FORBIDDEN'
	);
	const ok = await service.updateStatus(AUTHOR, {
		id: 'c1', expectedVersion: 1, status: 'completed', requestId: 'reuse'
	});
	assert.equal(ok.businessStatus, 'completed');
});

// ---------- 发布、审核与可见性 ----------

test('新提交的内容为待处理，公开列表看不到', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	assert.equal(created.visibility, 'pending');

	const list = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(list.items.length, 0);
});

test('游客读取待审内容被拒绝', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	await assert.rejects(
		service.getPublic(GUEST, { id: created.id }),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
});

test('作者可以查看自己的待审内容', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const mine = await service.getPublic(AUTHOR, { id: created.id });
	assert.equal(mine.id, created.id);
	assert.equal(mine.title, '转手九成新台灯');
});

test('授权审核员通过后内容才公开', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });

	const pending = await service.getPublic(REVIEWER, { id: created.id });
	assert.equal(pending.visibility, 'pending');

	const decision = await service.decideContent(REVIEWER, {
		targetId: pending.pendingRevisionId, expectedVersion: created.version,
		action: 'approve', requestId: 'd1'
	});
	assert.equal(decision.outcome, 'approved');

	const list = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(list.items.length, 1);
});

test('普通作者不能审批通过自己的内容', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const mine = await service.getPublic(AUTHOR, { id: created.id });
	await assert.rejects(
		service.decideContent(AUTHOR, {
			targetId: mine.pendingRevisionId, expectedVersion: created.version,
			action: 'approve', requestId: 'd1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);
});

test('审核沿用过期版本时不发布用户后来修改的版本', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const firstPending = await service.getPublic(AUTHOR, { id: created.id });

	await service.editContent(AUTHOR, {
		id: created.id, expectedVersion: created.version,
		title: '改过的标题', body: '改过的正文', requestId: 'r2'
	});

	await assert.rejects(
		service.decideContent(REVIEWER, {
			targetId: firstPending.pendingRevisionId, expectedVersion: created.version,
			action: 'approve', requestId: 'd1'
		}),
		(error) => error.code === 'VERSION_CONFLICT'
	);
});

test('驳回后内容不公开，作者可以看到驳回状态', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const mine = await service.getPublic(AUTHOR, { id: created.id });
	await service.decideContent(REVIEWER, {
		targetId: mine.pendingRevisionId, expectedVersion: created.version,
		action: 'reject', reason: '信息不完整', requestId: 'd1'
	});

	const list = await service.listPublic(GUEST, { kind: 'idle' });
	assert.equal(list.items.length, 0);

	const mineList = await service.listMine(AUTHOR, {});
	assert.equal(mineList.items[0].visibility, 'rejected');
});

test('审核决定与日志都会被记录', async () => {
	const { repository, service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const mine = await service.getPublic(AUTHOR, { id: created.id });
	await service.decideContent(REVIEWER, {
		targetId: mine.pendingRevisionId, expectedVersion: created.version,
		action: 'approve', requestId: 'd1'
	});
	const decisions = repository.listDecisions();
	const logs = repository.listAuditLogs();
	assert.equal(decisions.length, 1);
	assert.equal(decisions[0].actorId, 'R');
	assert.equal(logs.length, 1);
});

// ---------- 编辑保留旧公开版本 ----------

test('已公开内容被编辑时旧版本继续公开，待审正文不泄漏', async () => {
	const { service } = setup();
	const created = await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const pending = await service.getPublic(AUTHOR, { id: created.id });
	await service.decideContent(REVIEWER, {
		targetId: pending.pendingRevisionId, expectedVersion: created.version,
		action: 'approve', requestId: 'd1'
	});

	const edited = await service.editContent(AUTHOR, {
		id: created.id, expectedVersion: 2,
		title: '新的标题', body: '尚未通过审核的新正文', requestId: 'r2'
	});
	assert.equal(edited.visibility, 'published');

	const publicView = await service.getPublic(GUEST, { id: created.id });
	assert.equal(publicView.title, '转手九成新台灯');
	assert.notEqual(publicView.body, '尚未通过审核的新正文');
});

test('已下架内容不能编辑，避免通过编辑恢复', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', ...validIdle() });
	const root = await repository.getById('c1');
	await repository.saveWithVersion({ ...root, visibility: 'removed' }, root.version);

	await assert.rejects(
		service.editContent(AUTHOR, {
			id: 'c1', expectedVersion: 2, title: 'x', body: 'y', requestId: 'r1'
		}),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
});

// ---------- 删除 ----------

test('作者删除后公开列表与详情都不可见', async () => {
	const { service } = setup();
	await service.submitContent(AUTHOR, { ...validIdle(), requestId: 'r1' });
	const list = await service.listMine(AUTHOR, {});
	const id = list.items[0].id;
	const version = list.items[0].version;

	const removed = await service.deleteContent(AUTHOR, { id, expectedVersion: version, requestId: 'r2' });
	assert.equal(removed.visibility, 'deleted');

	await assert.rejects(
		service.getPublic(GUEST, { id }),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
	const after = await service.listMine(AUTHOR, {});
	assert.equal(after.items.length, 0);
});

test('删除不存在的内容返回不可用', async () => {
	const { service } = setup();
	await assert.rejects(
		service.deleteContent(AUTHOR, { id: 'missing', expectedVersion: 1, requestId: 'r1' }),
		(error) => error.code === 'CONTENT_UNAVAILABLE'
	);
});

// ---------- 公开查询 ----------

test('公开列表按板块过滤并支持关键词、分类与区域', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({
		id: 'c1', authorId: 'A', ...validIdle(), createdAt: 1
	});
	await repository.seedPublished({
		id: 'c2', authorId: 'A',
		kind: 'wanted',
		title: '求购自行车',
		body: '想买一辆能骑的',
		details: { category: '交通工具', neededQuantity: 1, budgetType: 'negotiable' },
		businessStatus: 'seeking',
		createdAt: 2
	});

	assert.equal((await service.listPublic(GUEST, { kind: 'idle' })).items.length, 1);
	assert.equal((await service.listPublic(GUEST, { keyword: '自行车' })).items.length, 1);
	assert.equal((await service.listPublic(GUEST, { category: '交通工具' })).items.length, 1);
	assert.equal((await service.listPublic(GUEST, { region: '五号宿舍楼下' })).items.length, 1);
	assert.equal((await service.listPublic(GUEST, { kind: 'delivery' })).items.length, 0);
});

test('公开列表最新优先，游标翻页不重复不遗漏', async () => {
	const { repository, service } = setup();
	for (let i = 1; i <= 5; i++) {
		await repository.seedPublished({
			id: `c${i}`, authorId: 'A', ...validIdle(), title: `第 ${i} 条`, createdAt: i
		});
	}
	const first = await service.listPublic(GUEST, { kind: 'idle', limit: 2 });
	assert.deepEqual(first.items.map((item) => item.title), ['第 5 条', '第 4 条']);
	assert.ok(first.nextCursor);

	const second = await service.listPublic(GUEST, { kind: 'idle', limit: 2, cursor: first.nextCursor });
	assert.deepEqual(second.items.map((item) => item.title), ['第 3 条', '第 2 条']);

	const third = await service.listPublic(GUEST, { kind: 'idle', limit: 2, cursor: second.nextCursor });
	assert.deepEqual(third.items.map((item) => item.title), ['第 1 条']);
	assert.equal(third.nextCursor, null);
});

test('公开列表不接受超过上限的 limit', async () => {
	const { repository, service } = setup();
	for (let i = 1; i <= 60; i++) {
		await repository.seedPublished({ id: `c${i}`, authorId: 'A', ...validIdle(), createdAt: i });
	}
	const page = await service.listPublic(GUEST, { kind: 'idle', limit: 999 });
	assert.ok(page.items.length <= 50);
});

test('本人列表只返回自己的内容', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A' });
	await repository.seedPublished({ id: 'c2', authorId: 'B' });
	const mine = await service.listMine(AUTHOR, {});
	assert.equal(mine.items.length, 1);
	assert.equal(mine.items[0].id, 'c1');
});

test('未登录不能读取本人列表', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listMine(GUEST, {}),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

// ---------- 四类提交 ----------

test('四类信息都可以提交并进入待审', async () => {
	const { service } = setup();
	for (const input of [validDelivery(), validIdle(), validWanted(), validWall()]) {
		const created = await service.submitContent(AUTHOR, { ...input, requestId: `k-${input.kind}` });
		assert.equal(created.visibility, 'pending', input.kind);
		assert.equal(created.version, 1);
	}
});

test('字段不合法的提交被拒绝且不写入仓储', async () => {
	const { repository, service } = setup();
	const broken = validIdle();
	broken.details.remainingQuantity = -1;
	await assert.rejects(
		service.submitContent(AUTHOR, { ...broken, requestId: 'r1' }),
		(error) => error.code === 'INVALID_INPUT'
	);
	assert.equal(repository.countRoots(), 0);
});

test('缺少 requestId 的写请求被拒绝', async () => {
	const { service } = setup();
	await assert.rejects(
		service.submitContent(AUTHOR, validIdle()),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('公开内容返回的 DTO 不含内部字段', async () => {
	const { repository, service } = setup();
	await repository.seedPublished({ id: 'c1', authorId: 'A', ...validIdle() });
	const view = await service.getPublic(GUEST, { id: 'c1' });
	assert.equal(view.id, 'c1');
	assert.equal(view.kind, 'idle');
	assert.equal(view.title, '转手九成新台灯');
	for (const leaked of ['pendingRevisionId', 'publishedRevisionId', 'deletedByAuthor', 'visibility']) {
		assert.equal(Object.prototype.hasOwnProperty.call(view, leaked), false, `泄漏字段 ${leaked}`);
	}
});
