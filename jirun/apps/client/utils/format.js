/** 页面共用的展示格式化。 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 相对时间：刚发布的内容显示「刚刚」，较旧的显示日期。 */
export function formatTime(timestamp) {
	if (!timestamp) return '';
	const diff = Date.now() - timestamp;
	if (diff < MINUTE) return '刚刚';
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
	if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;

	const date = new Date(timestamp);
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 金额以「分」存储，展示时转成元；整元不显示小数。 */
export function formatAmount(amountFen) {
	if (typeof amountFen !== 'number') return '';
	const yuan = amountFen / 100;
	return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

/** 价格类型文案。平台不参与交易，这里只表达意向。 */
export function formatPriceType(type) {
	return { amount: '', negotiable: '面议', free: '免费赠送' }[type] || '';
}

/** 昵称缺省时退回用户标识，避免出现空白作者。 */
export function displayName(author) {
	if (!author) return '匿名用户';
	return author.nickname || author.userId || '匿名用户';
}

/** 头像占位取昵称首字。真实头像由媒体服务签发访问凭据后替换。 */
export function avatarText(author) {
	const name = displayName(author);
	return name.slice(0, 1);
}
