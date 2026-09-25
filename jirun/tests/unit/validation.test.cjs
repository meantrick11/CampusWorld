const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { validateContent, LIMITS } = require(path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain/validation.js'
));

// contracts.md 第 2、4 节：字段边界、价格类型与媒体约束。
// 长度按 Unicode 码点计算；价格类型 amount/negotiable/free 中只有 amount 携带金额。

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
	mediaIds: ['m1'],
	mediaTypes: ['image'],
	details: {
		category: '生活用品',
		remainingQuantity: 1,
		priceType: 'amount',
		amountFen: 1500,
		handoverRegion: '五号宿舍楼下'
	}
});

const validWanted = () => ({
	kind: 'wanted',
	title: '求购二手自行车',
	body: '希望车况能正常骑行。',
	mediaIds: [],
	mediaTypes: [],
	details: {
		category: '交通工具',
		neededQuantity: 1,
		budgetType: 'negotiable'
	}
});

const validWall = () => ({
	kind: 'wall',
	title: '',
	body: '今晚操场有社团招新。',
	mediaIds: ['m1', 'm2'],
	mediaTypes: ['image', 'image'],
	details: { mediaForm: 'image', topic: '社团' }
});

const fieldsOf = (result) => result.errors.map((e) => e.field);
const hasError = (result, field, code) =>
	result.errors.some((e) => e.field === field && (!code || e.code === code));

test('四类有效输入都通过校验', () => {
	for (const input of [validDelivery(), validIdle(), validWanted(), validWall()]) {
		const result = validateContent(input);
		assert.equal(result.valid, true, `${input.kind} 应通过：${JSON.stringify(result.errors)}`);
		assert.deepEqual(result.errors, []);
	}
});

test('未知信息类型拒绝，不与订单类状态混用', () => {
	const result = validateContent({ ...validIdle(), kind: 'order' });
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'kind', 'UNKNOWN_KIND'));
});

test('缺少 kind 时拒绝', () => {
	const { kind, ...rest } = validIdle();
	assert.equal(validateContent(rest).valid, false);
});

test('缺少 details 时拒绝', () => {
	const { details, ...rest } = validIdle();
	const result = validateContent(rest);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details', 'REQUIRED'));
});

test('标题正好 60 个码点时通过', () => {
	const title = '同'.repeat(LIMITS.TITLE_MAX);
	assert.equal(validateContent({ ...validIdle(), title }).valid, true);
});

test('标题超过 60 个码点时拒绝', () => {
	const title = '同'.repeat(LIMITS.TITLE_MAX + 1);
	const result = validateContent({ ...validIdle(), title });
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'title', 'TOO_LONG'));
});

test('标题长度按码点计算，双 UTF-16 单元字符不会被误判', () => {
	// 30 个 𠮷 是 30 个码点但 60 个 UTF-16 单元；若按 .length 计算会误判为超限
	const title = '𠮷'.repeat(30);
	assert.equal(validateContent({ ...validIdle(), title }).valid, true);
});

test('正文超过 3000 个码点时拒绝', () => {
	const body = '字'.repeat(LIMITS.BODY_MAX + 1);
	const result = validateContent({ ...validIdle(), body });
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'body', 'TOO_LONG'));
});

test('四类信息都要求标题，校园墙除外', () => {
	assert.equal(validateContent({ ...validDelivery(), title: '' }).valid, false);
	assert.equal(validateContent({ ...validIdle(), title: '' }).valid, false);
	assert.equal(validateContent({ ...validWanted(), title: '' }).valid, false);
	assert.equal(validateContent({ ...validWall(), title: '' }).valid, true);
});

test('取送缺少终点区域时拒绝', () => {
	const input = validDelivery();
	delete input.details.toRegion;
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.toRegion', 'REQUIRED'));
});

test('取送缺少起点区域时拒绝', () => {
	const input = validDelivery();
	input.details.fromRegion = '   ';
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.fromRegion', 'REQUIRED'));
});

test('取送件数必须是正整数，0 与负数都拒绝', () => {
	for (const pieces of [0, -1]) {
		const input = validDelivery();
		input.details.pieces = pieces;
		const result = validateContent(input);
		assert.equal(result.valid, false, `pieces=${pieces}`);
		assert.ok(hasError(result, 'details.pieces', 'OUT_OF_RANGE'));
	}
});

test('取送报酬为面议时不需要金额', () => {
	const input = validDelivery();
	input.details.rewardType = 'negotiable';
	assert.equal(validateContent(input).valid, true);
});

test('取送报酬为金额时必须携带非负整数金额', () => {
	const missing = validDelivery();
	missing.details.rewardType = 'amount';
	const missingResult = validateContent(missing);
	assert.equal(missingResult.valid, false);
	assert.ok(hasError(missingResult, 'details.rewardFen', 'REQUIRED'));

	const negative = validDelivery();
	negative.details.rewardType = 'amount';
	negative.details.rewardFen = -1;
	const negativeResult = validateContent(negative);
	assert.equal(negativeResult.valid, false);
	assert.ok(hasError(negativeResult, 'details.rewardFen', 'OUT_OF_RANGE'));

	const zero = validDelivery();
	zero.details.rewardType = 'amount';
	zero.details.rewardFen = 0;
	assert.equal(validateContent(zero).valid, true);
});

test('未声明奖励类型时拒绝', () => {
	const input = validDelivery();
	input.details.rewardType = '红包';
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.rewardType', 'INVALID_OPTION'));
});

test('闲置数量为负数时拒绝', () => {
	const input = validIdle();
	input.details.remainingQuantity = -1;
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.remainingQuantity', 'OUT_OF_RANGE'));
});

test('闲置数量为非整数时拒绝', () => {
	const input = validIdle();
	input.details.remainingQuantity = 1.5;
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.remainingQuantity', 'NOT_INTEGER'));
});

test('闲置数量归零仍可保存，只是退出有效列表', () => {
	const input = validIdle();
	input.details.remainingQuantity = 0;
	assert.equal(validateContent(input).valid, true);
});

test('闲置金额为非整数时拒绝', () => {
	const input = validIdle();
	input.details.amountFen = 15.5;
	const result = validateContent(input);
	assert.equal(input.details.priceType, 'amount');
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.amountFen', 'NOT_INTEGER'));
});

test('有效赠送不需要金额', () => {
	const input = validIdle();
	input.details.priceType = 'free';
	delete input.details.amountFen;
	assert.equal(validateContent(input).valid, true);
});

test('闲置金额类型缺少金额时拒绝', () => {
	const input = validIdle();
	delete input.details.amountFen;
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'details.amountFen', 'REQUIRED'));
});

test('求购尚需数量必须为正整数', () => {
	for (const neededQuantity of [0, -2, 1.5]) {
		const input = validWanted();
		input.details.neededQuantity = neededQuantity;
		assert.equal(validateContent(input).valid, false, `neededQuantity=${neededQuantity}`);
	}
});

test('空校园墙拒绝：既没有正文也没有媒体', () => {
	const input = validWall();
	input.body = '   ';
	input.mediaIds = [];
	input.mediaTypes = [];
	input.details.mediaForm = 'text';
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'body', 'EMPTY_CONTENT'));
});

test('校园墙纯文字帖可以没有媒体', () => {
	const input = validWall();
	input.mediaIds = [];
	input.mediaTypes = [];
	input.details.mediaForm = 'text';
	assert.equal(validateContent(input).valid, true);
});

test('校园墙图片与视频混排时拒绝', () => {
	const input = validWall();
	input.mediaIds = ['m1', 'm2'];
	input.mediaTypes = ['image', 'video'];
	input.details.mediaForm = 'image';
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaTypes', 'MEDIA_KIND_MISMATCH'));
});

test('校园墙视频帖必须且只能有一段视频', () => {
	const ok = validWall();
	ok.mediaIds = ['v1'];
	ok.mediaTypes = ['video'];
	ok.details.mediaForm = 'video';
	assert.equal(validateContent(ok).valid, true);

	const tooMany = validWall();
	tooMany.mediaIds = ['v1', 'v2'];
	tooMany.mediaTypes = ['video', 'video'];
	tooMany.details.mediaForm = 'video';
	const tooManyResult = validateContent(tooMany);
	assert.equal(tooManyResult.valid, false);
	assert.ok(hasError(tooManyResult, 'mediaIds', 'MEDIA_COUNT_EXCEEDED'));

	const none = validWall();
	none.mediaIds = [];
	none.mediaTypes = [];
	none.details.mediaForm = 'video';
	assert.equal(validateContent(none).valid, false);
});

test('图片数量超过 9 张时拒绝', () => {
	const input = validWall();
	const count = LIMITS.IMAGE_MAX + 1;
	input.mediaIds = Array.from({ length: count }, (_, i) => `m${i}`);
	input.mediaTypes = Array.from({ length: count }, () => 'image');
	input.details.mediaForm = 'image';
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaIds', 'MEDIA_COUNT_EXCEEDED'));
});

test('图片正好 9 张时通过', () => {
	const input = validWall();
	input.mediaIds = Array.from({ length: LIMITS.IMAGE_MAX }, (_, i) => `m${i}`);
	input.mediaTypes = Array.from({ length: LIMITS.IMAGE_MAX }, () => 'image');
	input.details.mediaForm = 'image';
	assert.equal(validateContent(input).valid, true);
});

test('非校园墙信息不允许携带视频', () => {
	const input = validIdle();
	input.mediaTypes = ['video'];
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaTypes', 'MEDIA_KIND_MISMATCH'));
});

test('媒体类型数量与媒体标识不一致时拒绝', () => {
	const input = validIdle();
	input.mediaIds = ['m1', 'm2'];
	input.mediaTypes = ['image'];
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaTypes', 'MEDIA_INFO_MISMATCH'));
});

test('媒体标识重复时拒绝', () => {
	const input = validIdle();
	input.mediaIds = ['m1', 'm1'];
	input.mediaTypes = ['image', 'image'];
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaIds', 'DUPLICATE_MEDIA'));
});

test('校园墙媒体形式为空但带媒体时仍校验数量上限', () => {
	const input = validWall();
	const count = LIMITS.IMAGE_MAX + 1;
	input.mediaIds = Array.from({ length: count }, (_, i) => `m${i}`);
	input.mediaTypes = Array.from({ length: count }, () => 'image');
	delete input.details.mediaForm;
	const result = validateContent(input);
	assert.equal(result.valid, false);
	assert.ok(hasError(result, 'mediaIds', 'MEDIA_COUNT_EXCEEDED'));
});

test('校验不修改传入参数', () => {
	const input = validIdle();
	const snapshot = JSON.stringify(input);
	validateContent(input);
	assert.equal(JSON.stringify(input), snapshot);
});

test('错误项包含字段路径，便于页面定位到具体输入', () => {
	const input = validDelivery();
	delete input.details.toRegion;
	const result = validateContent(input);
	assert.ok(fieldsOf(result).length > 0);
	for (const error of result.errors) {
		assert.equal(typeof error.field, 'string');
		assert.equal(typeof error.code, 'string');
	}
});
