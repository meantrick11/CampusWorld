const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const {
	canDeleteComment,
	canViewFavorites,
	canFollow,
	canReact,
	isAllowedReactionType,
	isReplyingToTopLevel
} = require(path.join(DOMAIN, 'social-policy.js'));

// contracts.md 第 2 节与计划 T07：帖子作者不能删除别人的评论；
// 收藏仅本人可见；关注与公开回复不解锁私聊；计数以服务端为准。

test('帖子作者不能代删其他人的评论', () => {
	assert.equal(canDeleteComment({ actorId: 'post-author', commentAuthorId: 'reader' }), false);
	assert.equal(canDeleteComment({ actorId: 'reader', commentAuthorId: 'reader' }), true);
});

test('审核员可以通过治理通道删除评论，但那是另一条记录留痕的路径', () => {
	assert.equal(canDeleteComment({ actorId: 'reviewer', commentAuthorId: 'reader', isReviewer: true }), true);
});

test('缺少当前用户标识时一律不允许删除', () => {
	assert.equal(canDeleteComment({ commentAuthorId: 'reader' }), false);
	assert.equal(canDeleteComment({ actorId: '', commentAuthorId: 'reader' }), false);
});

test('审核员标记必须是布尔真值，字符串不算授权', () => {
	assert.equal(canDeleteComment({ actorId: 'reviewer', commentAuthorId: 'reader', isReviewer: 'true' }), false);
});

test('收藏只有本人可见，他人即使知道标识也拒绝', () => {
	assert.equal(canViewFavorites({ actorId: 'A', ownerId: 'A' }), true);
	assert.equal(canViewFavorites({ actorId: 'B', ownerId: 'A' }), false);
	assert.equal(canViewFavorites({ actorId: '', ownerId: 'A' }), false);
	assert.equal(canViewFavorites({ ownerId: 'A' }), false);
});

test('不能关注自己', () => {
	assert.equal(canFollow({ actorId: 'A', targetUserId: 'A' }), false);
	assert.equal(canFollow({ actorId: 'A', targetUserId: 'B' }), true);
	assert.equal(canFollow({ actorId: '', targetUserId: 'B' }), false);
	assert.equal(canFollow({ actorId: 'A' }), false);
});

test('只接受 like 与 favorite 两种反应类型', () => {
	assert.equal(isAllowedReactionType('like'), true);
	assert.equal(isAllowedReactionType('favorite'), true);
	assert.equal(isAllowedReactionType('love'), false);
	assert.equal(isAllowedReactionType(''), false);
	assert.equal(isAllowedReactionType(undefined), false);
});

test('互动只作用于可见的校园墙内容', () => {
	const visibleWall = { kind: 'wall', visibility: 'published', revisionStatus: 'approved', businessStatus: null };
	assert.equal(canReact({ actorId: 'A', content: visibleWall }), true);

	const pending = { ...visibleWall, visibility: 'pending' };
	assert.equal(canReact({ actorId: 'A', content: pending }), false);

	const removed = { ...visibleWall, visibility: 'removed' };
	assert.equal(canReact({ actorId: 'A', content: removed }), false);

	const idle = { ...visibleWall, kind: 'idle' };
	assert.equal(canReact({ actorId: 'A', content: idle }), false);

	assert.equal(canReact({ content: visibleWall }), false);
	assert.equal(canReact({ actorId: 'A' }), false);
});

test('回复只允许一层，不能回复回复', () => {
	assert.equal(isReplyingToTopLevel({ parentId: null, parentComment: null }), true);
	assert.equal(isReplyingToTopLevel({ parentId: 'c1', parentComment: { id: 'c1', parentId: null } }), true);
	assert.equal(isReplyingToTopLevel({
		parentId: 'c2',
		parentComment: { id: 'c2', parentId: 'c1' }
	}), false);
	assert.equal(isReplyingToTopLevel({ parentId: 'missing', parentComment: null }), false);
});
