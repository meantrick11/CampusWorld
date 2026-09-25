/**
 * 校园墙互动适配器：点赞、评论、回复、收藏、关注。
 *
 * 与 content.js 同样的两种来源：
 * - 云端：jirun-social 云对象，规则由服务端判定。
 * - 本地样例：未连接云端时用一个内存存储模拟同一套语义（唯一关系、
 *   服务端计算计数、新评论先待审不公开），并回传 localSample: true。
 *
 * 本地样例里的当前用户固定为 LOCAL_USER，因为预览环境没有登录。这只影响样例，
 * 不代表登录可以被绕过——正式环境仍由服务端 token 决定身份。
 */

import { sampleComments } from './local-sample-data.js';
import { hasCloud, callCloud, toError } from './cloud-call.js';

const CLOUD_OBJECT = 'jirun-social';

/** 预览环境没有登录，本地样例统一用这个标识代表「我」。 */
export const LOCAL_USER = 'local-me';

const call = (method, params) => callCloud(CLOUD_OBJECT, method, params);

// ---------------- 本地样例状态 ----------------

const localReactions = new Set(); // `${actorId}|${contentId}|${type}`
const localFollows = new Set(); // `${actorId}|${targetUserId}`
const localComments = new Map(); // contentId -> 评论数组

function commentsOf(contentId) {
	if (!localComments.has(contentId)) {
		localComments.set(contentId, (sampleComments[contentId] || []).map((item) => ({ ...item })));
	}
	return localComments.get(contentId);
}

const reactionKey = (actorId, contentId, type) => `${actorId}|${contentId}|${type}`;
const followKey = (actorId, targetUserId) => `${actorId}|${targetUserId}`;

const countLocalReactions = (contentId, type) => {
	let total = 0;
	for (const key of localReactions) {
		const [, keyContentId, keyType] = key.split('|');
		if (keyContentId === contentId && keyType === type) total += 1;
	}
	return total;
};

const visibleLocalComments = (contentId) =>
	commentsOf(contentId).filter((item) => item.reviewStatus === 'approved' && item.deleted !== true);

/** 本地样例一律用 LOCAL_USER 作为当前用户，因此本人可删自己的评论。 */
const localCommentDTO = (comment) => ({
	id: comment.id,
	author: { userId: comment.authorId },
	body: comment.body,
	parentId: comment.parentId || null,
	createdAt: comment.createdAt,
	canDelete: comment.authorId === LOCAL_USER
});

// ---------------- 对外接口 ----------------

export async function setReaction({ contentId, type, enabled }) {
	if (hasCloud()) return call('setReaction', { contentId, type, enabled, requestId: rid('react') });
	if (!['like', 'favorite'].includes(type)) throw toError('INVALID_INPUT', '不支持的反应类型');
	const key = reactionKey(LOCAL_USER, contentId, type);
	if (enabled) localReactions.add(key);
	else localReactions.delete(key);
	return {
		data: {
			enabled: Boolean(enabled),
			count: countLocalReactions(contentId, type)
		},
		localSample: true
	};
}

export async function setFollow({ userId, enabled }) {
	if (hasCloud()) return call('setFollow', { userId, enabled, requestId: rid('follow') });
	if (!userId || userId === LOCAL_USER) throw toError('INVALID_INPUT', '不能关注自己');
	const key = followKey(LOCAL_USER, userId);
	if (enabled) localFollows.add(key);
	else localFollows.delete(key);
	let followers = 0;
	for (const item of localFollows) {
		if (item.split('|')[1] === userId) followers += 1;
	}
	return {
		data: { enabled: Boolean(enabled), followers },
		localSample: true
	};
}

export async function submitComment({ contentId, parentId, body, requestId }) {
	if (hasCloud()) {
		return call('submitComment', { contentId, parentId, body, requestId: requestId || rid('comment') });
	}
	const text = typeof body === 'string' ? body.trim() : '';
	if (text === '') throw toError('INVALID_INPUT', '评论不能为空');
	if (text.length > 1000) throw toError('INVALID_INPUT', '评论最多 1000 个字');

	const list = commentsOf(contentId);
	if (parentId) {
		const parent = list.find((item) => item.id === parentId);
		if (!parent) throw toError('CONTENT_UNAVAILABLE', '被回复的评论不存在');
		if (parent.parentId) throw toError('INVALID_INPUT', '只支持一层回复');
	}
	const created = {
		id: `local-cm-${Date.now()}`,
		contentId,
		authorId: LOCAL_USER,
		body: text,
		parentId: parentId || null,
		// 与真实规则一致：新评论先进入待审，因此不会立即出现在公开列表里
		reviewStatus: 'pending',
		deleted: false,
		createdAt: Date.now()
	};
	list.push(created);
	return {
		data: { id: created.id, reviewStatus: created.reviewStatus },
		localSample: true
	};
}

export async function listComments({ contentId, cursor, limit }) {
	if (hasCloud()) return call('listComments', { contentId, cursor, limit });
	const topLevel = visibleLocalComments(contentId).filter((item) => !item.parentId);
	const size = Math.min(Math.max(Number(limit) || 20, 1), 50);
	const start = cursor ? Number(cursor) : 0;
	const page = topLevel.slice(start, start + size);
	const nextStart = start + size;
	return {
		data: {
			items: page.map((comment) => ({
				...localCommentDTO(comment),
				replies: visibleLocalComments(contentId)
					.filter((item) => item.parentId === comment.id)
					.map(localCommentDTO)
			})),
			nextCursor: nextStart < topLevel.length ? String(nextStart) : null
		},
		localSample: true
	};
}

export async function deleteOwnComment({ id, requestId }) {
	if (hasCloud()) return call('deleteOwnComment', { id, requestId: requestId || rid('delcomment') });
	for (const list of localComments.values()) {
		const found = list.find((item) => item.id === id);
		if (!found) continue;
		if (found.authorId !== LOCAL_USER) throw toError('FORBIDDEN', '只能删除自己的评论');
		found.deleted = true;
		return {
			data: { id, deleted: true },
			localSample: true
		};
	}
	throw toError('CONTENT_UNAVAILABLE', '该评论不存在');
}

export async function listFavorites({ cursor, limit }) {
	if (hasCloud()) return call('listFavorites', { cursor, limit });
	// 本地样例没有内容详情索引，收藏列表返回收藏到的内容标识与收藏时间
	const items = [];
	for (const key of localReactions) {
		const [actorId, contentId, type] = key.split('|');
		if (actorId !== LOCAL_USER || type !== 'favorite') continue;
		items.push({ id: contentId, favoritedAt: Date.now() });
	}
	return { data: { items, nextCursor: null }, localSample: true };
}

export async function listFollowing({ cursor, limit }) {
	if (hasCloud()) return call('listFollowing', { cursor, limit });
	const items = [];
	for (const key of localFollows) {
		const [actorId, targetUserId] = key.split('|');
		if (actorId !== LOCAL_USER) continue;
		items.push({ userId: targetUserId, followedAt: Date.now() });
	}
	return { data: { items, nextCursor: null }, localSample: true };
}

export async function getProfileState({ userId }) {
	if (hasCloud()) return call('getProfileState', { userId });
	let followers = 0;
	for (const key of localFollows) {
		if (key.split('|')[1] === userId) followers += 1;
	}
	return {
		data: {
			userId,
			following: localFollows.has(followKey(LOCAL_USER, userId)),
			followers
		},
		localSample: true
	};
}

/** 批量取互动计数与本人状态，供广场与详情一次取齐。 */
export async function getInteractionSummary({ contentIds }) {
	if (hasCloud()) return call('getInteractionSummary', { contentIds });
	const summary = {};
	for (const contentId of contentIds || []) {
		summary[contentId] = {
			likes: countLocalReactions(contentId, 'like'),
			favorites: countLocalReactions(contentId, 'favorite'),
			comments: visibleLocalComments(contentId).length,
			liked: localReactions.has(reactionKey(LOCAL_USER, contentId, 'like')),
			favorited: localReactions.has(reactionKey(LOCAL_USER, contentId, 'favorite'))
		};
	}
	return { data: summary, localSample: true };
}

/** 本地样例的 requestId 只用于接口形状一致，不参与去重。 */
function rid(prefix) {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
