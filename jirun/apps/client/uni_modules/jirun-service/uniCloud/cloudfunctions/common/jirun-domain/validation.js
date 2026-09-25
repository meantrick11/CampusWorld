'use strict';

/**
 * 四类信息的字段校验（contracts.md 第 2、4 节）。
 *
 * 纯函数，返回 { valid, errors }，errors 为 [{ field, code }]，
 * 便于页面定位到具体输入项。服务端必须再校验一次，不能只依赖前端。
 *
 * 长度统一按 Unicode 码点计算（中文与 emoji 计为一个字符）。
 * 价格类型 amount / negotiable / free 中只有 amount 携带非负整数金额。
 */

const LIMITS = {
	TITLE_MAX: 60,
	BODY_MAX: 3000,
	COMMENT_MAX: 1000,
	CHAT_MAX: 1000,
	IMAGE_MAX: 9,
	VIDEO_MAX: 1,
	VIDEO_DURATION_MAX_MS: 60 * 1000,
	IMAGE_SIZE_MAX_BYTES: 5 * 1024 * 1024,
	VIDEO_SIZE_MAX_BYTES: 50 * 1024 * 1024
};

const KINDS = ['delivery', 'idle', 'wanted', 'wall'];
const PRICE_TYPES = ['amount', 'negotiable', 'free'];
const BUDGET_TYPES = ['amount', 'negotiable'];
const WALL_MEDIA_FORMS = ['text', 'image', 'video'];
const MEDIA_TYPES = ['image', 'video'];

const CODES = {
	REQUIRED: 'REQUIRED',
	TOO_LONG: 'TOO_LONG',
	OUT_OF_RANGE: 'OUT_OF_RANGE',
	NOT_INTEGER: 'NOT_INTEGER',
	INVALID_OPTION: 'INVALID_OPTION',
	UNKNOWN_KIND: 'UNKNOWN_KIND',
	EMPTY_CONTENT: 'EMPTY_CONTENT',
	MEDIA_COUNT_EXCEEDED: 'MEDIA_COUNT_EXCEEDED',
	MEDIA_KIND_MISMATCH: 'MEDIA_KIND_MISMATCH',
	MEDIA_INFO_MISMATCH: 'MEDIA_INFO_MISMATCH',
	DUPLICATE_MEDIA: 'DUPLICATE_MEDIA'
};

const codePointLength = (text) => [...text].length;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const isInteger = (value) => typeof value === 'number' && Number.isInteger(value);

function requireString(details, key, field, add) {
	if (!isNonEmptyString(details[key])) add(field, CODES.REQUIRED);
}

function requireInteger(details, key, field, add, { min }) {
	const value = details[key];
	if (value === undefined || value === null) {
		add(field, CODES.REQUIRED);
		return;
	}
	if (!isInteger(value)) {
		add(field, CODES.NOT_INTEGER);
		return;
	}
	if (value < min) add(field, CODES.OUT_OF_RANGE);
}

/**
 * 校验价格类型及其金额：只有 amount 需要非负整数金额。
 * 面议与赠送不携带金额，不接受客户端上传的金额。
 */
function validatePriceKind(details, typeKey, amountKey, allowedTypes, add) {
	const type = details[typeKey];
	const typeField = `details.${typeKey}`;

	if (type === undefined || type === null || type === '') {
		add(typeField, CODES.REQUIRED);
		return;
	}
	if (!allowedTypes.includes(type)) {
		add(typeField, CODES.INVALID_OPTION);
		return;
	}
	if (type !== 'amount') return;

	const amountField = `details.${amountKey}`;
	const amount = details[amountKey];
	if (amount === undefined || amount === null) {
		add(amountField, CODES.REQUIRED);
		return;
	}
	if (!isInteger(amount)) {
		add(amountField, CODES.NOT_INTEGER);
		return;
	}
	if (amount < 0) add(amountField, CODES.OUT_OF_RANGE);
}

function validateText(input, add) {
	const { kind, title, body } = input;

	if (title !== undefined && title !== null && typeof title !== 'string') {
		add('title', CODES.INVALID_OPTION);
	} else if (typeof title === 'string') {
		if (codePointLength(title) > LIMITS.TITLE_MAX) add('title', CODES.TOO_LONG);
		if (kind !== 'wall' && title.trim() === '') add('title', CODES.REQUIRED);
	} else if (kind !== 'wall') {
		add('title', CODES.REQUIRED);
	}

	if (body !== undefined && body !== null && typeof body !== 'string') {
		add('body', CODES.INVALID_OPTION);
		return;
	}
	if (typeof body === 'string' && codePointLength(body) > LIMITS.BODY_MAX) {
		add('body', CODES.TOO_LONG);
	}
}

function validateMedia(input, add) {
	const ids = Array.isArray(input.mediaIds) ? input.mediaIds : [];
	const types = Array.isArray(input.mediaTypes) ? input.mediaTypes : [];
	const form = input.details ? input.details.mediaForm : undefined;

	if (ids.length !== types.length) {
		add('mediaTypes', CODES.MEDIA_INFO_MISMATCH);
		return;
	}
	if (ids.some((id) => !isNonEmptyString(id))) {
		add('mediaIds', CODES.REQUIRED);
		return;
	}
	if (new Set(ids).size !== ids.length) {
		add('mediaIds', CODES.DUPLICATE_MEDIA);
		return;
	}
	if (types.some((type) => !MEDIA_TYPES.includes(type))) {
		add('mediaTypes', CODES.INVALID_OPTION);
		return;
	}

	const videoCount = types.filter((type) => type === 'video').length;
	const imageCount = types.length - videoCount;

	// 视频只允许出现在校园墙
	if (input.kind !== 'wall') {
		if (videoCount > 0) {
			add('mediaTypes', CODES.MEDIA_KIND_MISMATCH);
			return;
		}
		if (imageCount > LIMITS.IMAGE_MAX) add('mediaIds', CODES.MEDIA_COUNT_EXCEEDED);
		return;
	}

	// 校园墙：图集与视频互斥
	if (form === 'video') {
		if (videoCount !== 1 || imageCount > 0) {
			if (ids.length > LIMITS.VIDEO_MAX) add('mediaIds', CODES.MEDIA_COUNT_EXCEEDED);
			else add('mediaIds', CODES.REQUIRED);
		}
		return;
	}
	if (form === 'image') {
		if (videoCount > 0) {
			add('mediaTypes', CODES.MEDIA_KIND_MISMATCH);
			return;
		}
		if (imageCount > LIMITS.IMAGE_MAX) add('mediaIds', CODES.MEDIA_COUNT_EXCEEDED);
		return;
	}
	if (form === 'text') {
		if (ids.length > 0) add('mediaIds', CODES.MEDIA_KIND_MISMATCH);
		return;
	}

	// 媒体形式缺失时仍执行类型对应的数量上限
	if (videoCount > LIMITS.VIDEO_MAX || imageCount > LIMITS.IMAGE_MAX) {
		add('mediaIds', CODES.MEDIA_COUNT_EXCEEDED);
	}
}

function validateDelivery(details, add) {
	requireString(details, 'category', 'details.category', add);
	requireString(details, 'size', 'details.size', add);
	requireInteger(details, 'pieces', 'details.pieces', add, { min: 1 });
	requireString(details, 'fromRegion', 'details.fromRegion', add);
	requireString(details, 'toRegion', 'details.toRegion', add);
	validatePriceKind(details, 'rewardType', 'rewardFen', PRICE_TYPES, add);
}

function validateIdle(details, add) {
	requireString(details, 'category', 'details.category', add);
	requireInteger(details, 'remainingQuantity', 'details.remainingQuantity', add, { min: 0 });
	requireString(details, 'handoverRegion', 'details.handoverRegion', add);
	validatePriceKind(details, 'priceType', 'amountFen', PRICE_TYPES, add);
}

function validateWanted(details, add) {
	requireString(details, 'category', 'details.category', add);
	requireInteger(details, 'neededQuantity', 'details.neededQuantity', add, { min: 1 });
	validatePriceKind(details, 'budgetType', 'budgetFen', BUDGET_TYPES, add);
}

function validateWall(details, add) {
	const form = details.mediaForm;
	if (form !== undefined && form !== null && form !== '' && !WALL_MEDIA_FORMS.includes(form)) {
		add('details.mediaForm', CODES.INVALID_OPTION);
	}
	const topic = details.topic;
	if (topic !== undefined && topic !== null && typeof topic !== 'string') {
		add('details.topic', CODES.INVALID_OPTION);
	}
}

/**
 * @param {object} input
 * @param {'delivery'|'idle'|'wanted'|'wall'} input.kind
 * @param {string} [input.title]
 * @param {string} [input.body]
 * @param {string[]} [input.mediaIds]
 * @param {('image'|'video')[]} [input.mediaTypes] 与 mediaIds 一一对应，由服务端按媒体记录填充
 * @param {object} [input.details]
 * @returns {{valid: boolean, errors: {field: string, code: string}[]}}
 */
function validateContent(input) {
	const errors = [];
	const add = (field, code) => errors.push({ field, code });

	if (!input || typeof input !== 'object') {
		add('input', CODES.REQUIRED);
		return { valid: false, errors };
	}

	const { kind, body, mediaIds, details } = input;

	if (!KINDS.includes(kind)) {
		add('kind', CODES.UNKNOWN_KIND);
		return { valid: false, errors };
	}
	if (!details || typeof details !== 'object' || Array.isArray(details)) {
		add('details', CODES.REQUIRED);
		return { valid: false, errors };
	}

	validateText(input, add);
	validateMedia(input, add);

	switch (kind) {
		case 'delivery':
			validateDelivery(details, add);
			break;
		case 'idle':
			validateIdle(details, add);
			break;
		case 'wanted':
			validateWanted(details, add);
			break;
		case 'wall':
			validateWall(details, add);
			// 校园墙不能既无正文也无媒体
			if (
				(typeof body === 'string' ? body.trim() : '') === '' &&
				(Array.isArray(mediaIds) ? mediaIds.length : 0) === 0
			) {
				add('body', CODES.EMPTY_CONTENT);
			}
			break;
		default:
			break;
	}

	return { valid: errors.length === 0, errors };
}

module.exports = {
	validateContent,
	LIMITS,
	KINDS,
	PRICE_TYPES,
	BUDGET_TYPES,
	WALL_MEDIA_FORMS,
	MEDIA_TYPES,
	CODES
};
