const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DOMAIN = path.join(
	__dirname,
	'../../apps/client/uni_modules/jirun-service/uniCloud/cloudfunctions/common/jirun-domain'
);
const CONFIG_DIR = path.join(__dirname, '../../apps/client/config');

const { LIMITS } = require(path.join(DOMAIN, 'validation.js'));
const clientLimits = require(path.join(CONFIG_DIR, 'limits.json'));

// contracts.md 第 2 节：客户端只做提示，服务端是最终判断依据。
// 两侧数值必须一致，否则界面允许提交的内容会被服务端拒绝，或反之出现越界放行。

const PAIRS = [
	['titleMax', 'TITLE_MAX'],
	['bodyMax', 'BODY_MAX'],
	['commentMax', 'COMMENT_MAX'],
	['chatMax', 'CHAT_MAX'],
	['imageMax', 'IMAGE_MAX'],
	['videoMax', 'VIDEO_MAX'],
	['videoDurationMaxMs', 'VIDEO_DURATION_MAX_MS'],
	['imageSizeMaxBytes', 'IMAGE_SIZE_MAX_BYTES'],
	['videoSizeMaxBytes', 'VIDEO_SIZE_MAX_BYTES']
];

test('客户端上限与服务端 LIMITS 完全一致', () => {
	for (const [clientKey, serverKey] of PAIRS) {
		assert.equal(
			clientLimits[clientKey],
			LIMITS[serverKey],
			`${clientKey} 与 ${serverKey} 不一致，客户端与服务端会判定不同`
		);
	}
});

test('客户端没有服务端未实现的上限，避免界面承诺服务端不认的规则', () => {
	const serverKeys = new Set(Object.values(LIMITS));
	const extra = Object.entries(clientLimits)
		.filter(([key]) => key !== '_comment')
		.filter(([, value]) => !serverKeys.has(value));
	assert.deepEqual(extra, []);
});

test('校园墙视频能力在两侧都保留', () => {
	// 计划明确要求不因赶进度删掉视频
	assert.equal(clientLimits.videoMax, 1);
	assert.equal(clientLimits.videoDurationMaxMs, 60000);
	assert.ok(clientLimits.videoSizeMaxBytes > 0);
	assert.equal(LIMITS.VIDEO_MAX, 1);
	assert.equal(LIMITS.VIDEO_DURATION_MAX_MS, 60000);
});

test('产品默认值中不存在任何付费能力开关', () => {
	const forbidden = [
		'pay', 'payment', 'wallet', 'balance', 'recharge', 'withdraw',
		'membership', 'vip', 'commission', 'donate', 'donation',
		'points', 'score', 'topup', 'deposit', 'pricing'
	];
	const keys = Object.keys(clientLimits);
	for (const key of keys) {
		const lower = key.toLowerCase();
		for (const word of forbidden) {
			assert.equal(
				lower.includes(word),
				false,
				`limits.json 出现疑似付费字段 ${key}`
			);
		}
	}
});
