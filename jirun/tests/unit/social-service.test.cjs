const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const { createSocialService } = require(path.join(DOMAIN, 'social-service.js'));
const {
	createMemorySocialRepository,
	REVIEW_STATUS
} = require('../support/memory-social-repository.cjs');

// contracts.md 第 2、5 节与计划 T07：唯一关系、计数以服务端为准、
// 收藏仅本人可见、作者不能删别人评论、关注不解锁私聊。

const AUTHOR = { userId: 'post-author' };
const READER = { userId: 'reader' };
const OTHER = { userId: 'other' };

function setup() {
	const repository = createMemorySocialRepository();
	const service = createSocialService({ repository, clock: () => 1000 });
	return { repository, service };
}

// ---------------- 点赞 ----------------

test('首次点赞建立一条关系并把计数加一', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });

	const result = await service.setReaction(READER, {
		contentId: 'w1',
		type: 'like',
		enabled: true,
		requestId: 'r1'
	});

	assert.equal(result.enabled, true);
	assert.equal(result.count, 1);
	assert.equal(repository.countReactionRows(), 1);
});

test('同一用户重复点赞不会产生第二条关系，计数保持为 1', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });

	for (let i = 0; i < 5; i++) {
		const result = await service.setReaction(READER, {
			contentId: 'w1',
			type: 'like',
			enabled: true,
			requestId: `r${i}`
		});
		assert.equal(result.count, 1, `第 ${i + 1} 次点赞后计数应仍为 1`);
	}
	assert.equal(repository.countReactionRows(), 1);
});

test('并发点赞 5 次最终只有一条关系，计数加一', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });

	const results = await Promise.allSettled(
		Array.from({ length: 5 }, (_, index) => service.setReaction(READER, {
			contentId: 'w1',
			type: 'like',
			enabled: true,
			requestId: `race-${index}`
		}))
	);

	assert.equal(repository.countReactionRows(), 1);
	const succeeded = results.filter((item) => item.status === 'fulfilled');
	assert.ok(succeeded.length >= 1);
	for (const item of succeeded) assert.equal(item.value.count, 1);
});

test('取消点赞重试两次不会重复减数', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await service.setReaction(READER, {
		contentId: 'w1',
		type: 'like',
		enabled: true,
		requestId: 'r1'
	});

	const first = await service.setReaction(READER, {
		contentId: 'w1',
		type: 'like',
		enabled: false,
		requestId: 'r2'
	});
	const second = await service.setReaction(READER, {
		contentId: 'w1',
		type: 'like',
		enabled: false,
		requestId: 'r3'
	});

	assert.equal(first.count, 0);
	assert.equal(second.count, 0);
	assert.equal(repository.countReactionRows(), 0);
});

test('客户端传入的计数值被忽略，以服务端统计为准', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await service.setReaction(READER, {
		contentId: 'w1',
		type: 'like',
		enabled: true,
		requestId: 'r1'
	});

	const forged = await service.setReaction(OTHER, {
		contentId: 'w1',
		type: 'like',
		enabled: true,
		count: 9999,
		likeCount: 9999,
		requestId: 'r2'
	});
	assert.equal(forged.count, 2);
});

test('待审与下架内容不能点赞', async () => {
	const { repository, service } = setup();
	await repository.seedWall({
		id: 'pending-1',
		authorId: 'post-author',
		visibility: 'pending'
	});
	await repository.seedWall({
		id: 'removed-1',
		authorId: 'post-author',
		visibility: 'removed'
	});

	for (const contentId of ['pending-1', 'removed-1']) {
		await assert.rejects(
			service.setReaction(READER, {
				contentId,
				type: 'like',
				enabled: true,
				requestId: `r-${contentId}`
			}),
			(error) => error.code === 'CONTENT_UNAVAILABLE',
			contentId
		);
	}
});

test('非点赞收藏类型被拒绝', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await assert.rejects(
		service.setReaction(READER, {
			contentId: 'w1',
			type: 'love',
			enabled: true,
			requestId: 'r1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('未登录不能点赞', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await assert.rejects(
		service.setReaction(null, {
			contentId: 'w1',
			type: 'like',
			enabled: true,
			requestId: 'r1'
		}),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

// ---------------- 收藏 ----------------

test('收藏列表只返回本人的收藏', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedWall({ id: 'w2', authorId: 'post-author', createdAt: 2 });
	await service.setReaction(READER, {
		contentId: 'w1',
		type: 'favorite',
		enabled: true,
		requestId: 'r1'
	});
	await service.setReaction(OTHER, {
		contentId: 'w2',
		type: 'favorite',
		enabled: true,
		requestId: 'r2'
	});

	const mine = await service.listFavorites(READER, {});
	assert.equal(mine.items.length, 1);
	assert.equal(mine.items[0].id, 'w1');
});

test('未登录不能读取收藏列表', async () => {
	const { service } = setup();
	await assert.rejects(
		service.listFavorites(null, {}),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

test('收藏与点赞互不影响计数', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await service.setReaction(READER, {
		contentId: 'w1',
		type: 'favorite',
		enabled: true,
		requestId: 'r1'
	});

	const summary = await service.getInteractionSummary(READER, {
		contentIds: ['w1']
	});
	assert.equal(summary.w1.likes, 0);
	assert.equal(summary.w1.favorites, 1);
	assert.equal(summary.w1.favorited, true);
	assert.equal(summary.w1.liked, false);
});

// ---------------- 关注 ----------------

test('不能关注自己', async () => {
	const { service } = setup();
	await assert.rejects(
		service.setFollow(AUTHOR, {
			userId: 'post-author',
			enabled: true,
			requestId: 'r1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('关注重复操作幂等，取关重试不会重复减数', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });

	for (let i = 0; i < 3; i++) {
		const result = await service.setFollow(READER, {
			userId: 'post-author',
			enabled: true,
			requestId: `f${i}`
		});
		assert.equal(result.enabled, true);
		assert.equal(result.followers, 1);
	}
	assert.equal(repository.countFollowRows(), 1);

	await service.setFollow(READER, {
		userId: 'post-author',
		enabled: false,
		requestId: 'f-off-1'
	});
	const again = await service.setFollow(READER, {
		userId: 'post-author',
		enabled: false,
		requestId: 'f-off-2'
	});
	assert.equal(again.followers, 0);
	assert.equal(repository.countFollowRows(), 0);
});

test('关注列表返回已关注的用户，且不解锁私聊', async () => {
	const { service } = setup();
	await service.setFollow(READER, {
		userId: 'post-author',
		enabled: true,
		requestId: 'f1'
	});
	const following = await service.listFollowing(READER, {});
	assert.equal(following.items.length, 1);
	assert.equal(following.items[0].userId, 'post-author');
	assert.equal(following.items[0].unlocksChat, undefined);
});

test('公开主页状态显示关注关系与关注者数量', async () => {
	const { service } = setup();
	await service.setFollow(READER, {
		userId: 'post-author',
		enabled: true,
		requestId: 'f1'
	});
	const state = await service.getProfileState(READER, {
		userId: 'post-author'
	});
	assert.equal(state.following, true);
	assert.equal(state.followers, 1);

	const guestView = await service.getProfileState(null, {
		userId: 'post-author'
	});
	assert.equal(guestView.following, false);
	assert.equal(guestView.followers, 1);
});

// ---------------- 评论与回复 ----------------

test('未登录不能发表评论', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await assert.rejects(
		service.submitComment(null, {
			contentId: 'w1',
			body: '同意',
			requestId: 'r1'
		}),
		(error) => error.code === 'AUTH_REQUIRED'
	);
});

test('新评论进入待审，公开列表看不到', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });

	const created = await service.submitComment(READER, {
		contentId: 'w1',
		body: '同意',
		requestId: 'r1'
	});
	assert.equal(created.reviewStatus, REVIEW_STATUS.PENDING);

	const list = await service.listComments(null, { contentId: 'w1' });
	assert.equal(list.items.length, 0);
});

test('只有通过审核的评论对读者可见', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-ok',
		contentId: 'w1',
		authorId: 'reader',
		reviewStatus: REVIEW_STATUS.APPROVED,
		createdAt: 1
	});
	await repository.seedComment({
		id: 'cm-pending',
		contentId: 'w1',
		authorId: 'reader',
		reviewStatus: REVIEW_STATUS.PENDING,
		createdAt: 2
	});
	await repository.seedComment({
		id: 'cm-deleted',
		contentId: 'w1',
		authorId: 'reader',
		reviewStatus: REVIEW_STATUS.APPROVED,
		deleted: true,
		createdAt: 3
	});

	const list = await service.listComments(null, { contentId: 'w1' });
	assert.equal(list.items.length, 1);
	assert.equal(list.items[0].id, 'cm-ok');
});

test('回复作为一层结果挂在主评论下', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-top',
		contentId: 'w1',
		authorId: 'reader',
		body: '这个招新几点开始？',
		createdAt: 1
	});
	await repository.seedComment({
		id: 'cm-reply-1',
		contentId: 'w1',
		authorId: 'other',
		parentId: 'cm-top',
		body: '晚上七点',
		createdAt: 2
	});
	await repository.seedComment({
		id: 'cm-reply-2',
		contentId: 'w1',
		authorId: 'post-author',
		parentId: 'cm-top',
		body: '七点开始，欢迎来',
		createdAt: 3
	});

	const list = await service.listComments(null, { contentId: 'w1' });
	assert.equal(list.items.length, 1, '回复不应作为独立的顶层条目');
	assert.equal(list.items[0].id, 'cm-top');
	assert.deepEqual(
		list.items[0].replies.map((reply) => reply.body),
		['晚上七点', '七点开始，欢迎来'],
		'回复按时间正序挂在主评论下'
	);
});

test('不能回复回复，只允许一层', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-top',
		contentId: 'w1',
		authorId: 'reader',
		parentId: null
	});
	await repository.seedComment({
		id: 'cm-reply',
		contentId: 'w1',
		authorId: 'other',
		parentId: 'cm-top'
	});

	await assert.rejects(
		service.submitComment(READER, {
			contentId: 'w1',
			parentId: 'cm-reply',
			body: '再回复一层',
			requestId: 'r1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('空评论被拒绝', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await assert.rejects(
		service.submitComment(READER, {
			contentId: 'w1',
			body: '   ',
			requestId: 'r1'
		}),
		(error) => error.code === 'INVALID_INPUT'
	);
});

test('重复提交同一 requestId 只产生一条评论', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	const input = {
		contentId: 'w1',
		body: '同意',
		requestId: 'same'
	};
	const first = await service.submitComment(READER, input);
	const second = await service.submitComment(READER, input);
	assert.deepEqual(second, first);
});

test('本人可以删除自己的评论', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-1',
		contentId: 'w1',
		authorId: 'reader'
	});

	const result = await service.deleteOwnComment(READER, {
		id: 'cm-1',
		requestId: 'r1'
	});
	assert.equal(result.deleted, true);

	const list = await service.listComments(null, { contentId: 'w1' });
	assert.equal(list.items.length, 0);
});

test('帖子作者不能删除别人的评论', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-1',
		contentId: 'w1',
		authorId: 'reader'
	});

	await assert.rejects(
		service.deleteOwnComment(AUTHOR, {
			id: 'cm-1',
			requestId: 'r1'
		}),
		(error) => error.code === 'FORBIDDEN'
	);

	const comment = await repository.getComment('cm-1');
	assert.notEqual(comment.deleted, true);
});

test('评论列表按查看者返回能否删除，作者判断由服务端给出', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-1',
		contentId: 'w1',
		authorId: 'reader'
	});

	const asReader = await service.listComments(READER, { contentId: 'w1' });
	assert.equal(asReader.items[0].canDelete, true);

	const asAuthor = await service.listComments(AUTHOR, { contentId: 'w1' });
	assert.equal(asAuthor.items[0].canDelete, false);

	const asGuest = await service.listComments(null, { contentId: 'w1' });
	assert.equal(asGuest.items[0].canDelete, false);
});

test('评论总数只统计可见评论', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await repository.seedComment({
		id: 'cm-ok',
		contentId: 'w1',
		authorId: 'reader',
		reviewStatus: REVIEW_STATUS.APPROVED
	});
	await repository.seedComment({
		id: 'cm-pending',
		contentId: 'w1',
		authorId: 'reader',
		reviewStatus: REVIEW_STATUS.PENDING
	});

	const summary = await service.getInteractionSummary(null, {
		contentIds: ['w1']
	});
	assert.equal(summary.w1.comments, 1);
});

test('互动摘要只接受内容标识列表，不能查询他人的个人状态', async () => {
	const { repository, service } = setup();
	await repository.seedWall({ id: 'w1', authorId: 'post-author' });
	await service.setReaction(OTHER, {
		contentId: 'w1',
		type: 'like',
		enabled: true,
		requestId: 'r1'
	});

	const forReader = await service.getInteractionSummary(READER, {
		contentIds: ['w1']
	});
	assert.equal(forReader.w1.likes, 1);
	assert.equal(forReader.w1.liked, false);

	const forOther = await service.getInteractionSummary(OTHER, {
		contentIds: ['w1']
	});
	assert.equal(forOther.w1.liked, true);
});
