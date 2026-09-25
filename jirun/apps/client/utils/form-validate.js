/**
 * 发布表单的客户端校验。
 *
 * 定位：只为让用户更早看到问题，**不是**权限或限额的实现。服务端会用
 * jirun-domain/validation.js 再校验一次，并以服务端结果为准（该模块有 34 项测试）。
 *
 * 这里只做三类检查，避免与服务端规则各写一套而产生分歧：
 *   1. 必填项
 *   2. 长度上限（取自 config/limits.json，与服务端 LIMITS 由测试保证一致）
 *   3. 数字字段必须是整数、金额必须非负
 */

const codePointLength = (text) => [...String(text || '')].length;

const isInteger = (value) => typeof value === 'number' && Number.isInteger(value);

const isBlank = (value) => typeof value !== 'string' || value.trim() === '';

function checkPriceKind(details, typeKey, amountKey, allowed, errors) {
	const type = details[typeKey];
	const typeField = `details.${typeKey}`;
	if (isBlank(type) || !allowed.includes(type)) {
		errors[typeField] = '请选择一项';
		return;
	}
	if (type !== 'amount') return;
	const amount = details[amountKey];
	if (amount === undefined || amount === null || amount === '') {
		errors[`details.${amountKey}`] = '请填写金额';
		return;
	}
	if (!isInteger(amount)) {
		errors[`details.${amountKey}`] = '金额需为整数分';
		return;
	}
	if (amount < 0) errors[`details.${amountKey}`] = '金额不能为负数';
}

function checkPositiveInteger(details, key, label, errors) {
	const value = details[key];
	if (value === undefined || value === null || value === '') {
		errors[`details.${key}`] = `请填写${label}`;
		return;
	}
	if (!isInteger(value)) {
		errors[`details.${key}`] = `${label}需为整数`;
		return;
	}
	if (value < 1) errors[`details.${key}`] = `${label}需大于 0`;
}

function checkNonNegativeInteger(details, key, label, errors) {
	const value = details[key];
	if (value === undefined || value === null || value === '') {
		errors[`details.${key}`] = `请填写${label}`;
		return;
	}
	if (!isInteger(value)) {
		errors[`details.${key}`] = `${label}需为整数`;
		return;
	}
	if (value < 0) errors[`details.${key}`] = `${label}不能为负数`;
}

const requireText = (details, key, label, errors) => {
	if (isBlank(details[key])) errors[`details.${key}`] = `请填写${label}`;
};

/**
 * @param {object} payload 待提交内容
 * @param {object} limits 长度上限（config/limits.json）
 * @returns {object} 字段路径 -> 错误文案
 */
export function validateForm(payload, limits) {
	const errors = {};
	const details = payload.details || {};

	if (payload.kind !== 'wall') {
		if (isBlank(payload.title)) errors.title = '请填写标题';
		else if (codePointLength(payload.title) > limits.titleMax) {
			errors.title = `标题最多 ${limits.titleMax} 个字`;
		}
	}
	if (codePointLength(payload.body) > limits.bodyMax) {
		errors.body = `正文最多 ${limits.bodyMax} 个字`;
	}

	if (payload.kind === 'delivery') {
		requireText(details, 'category', '物品类别', errors);
		requireText(details, 'size', '大小', errors);
		requireText(details, 'fromRegion', '起点区域', errors);
		requireText(details, 'toRegion', '终点区域', errors);
		checkPositiveInteger(details, 'pieces', '件数', errors);
		checkPriceKind(details, 'rewardType', 'rewardFen', ['amount', 'negotiable', 'free'], errors);
	}

	if (payload.kind === 'idle') {
		requireText(details, 'category', '分类', errors);
		requireText(details, 'handoverRegion', '交接区域', errors);
		checkNonNegativeInteger(details, 'remainingQuantity', '剩余数量', errors);
		checkPriceKind(details, 'priceType', 'amountFen', ['amount', 'negotiable', 'free'], errors);
	}

	if (payload.kind === 'wanted') {
		requireText(details, 'category', '分类', errors);
		checkPositiveInteger(details, 'neededQuantity', '尚需数量', errors);
		checkPriceKind(details, 'budgetType', 'budgetFen', ['amount', 'negotiable'], errors);
	}

	if (payload.kind === 'wall') {
		const mediaCount = (payload.mediaIds || []).length;
		if (isBlank(payload.body) && mediaCount === 0) {
			errors.body = '校园墙需要正文或媒体至少一种';
		}
	}

	return errors;
}
