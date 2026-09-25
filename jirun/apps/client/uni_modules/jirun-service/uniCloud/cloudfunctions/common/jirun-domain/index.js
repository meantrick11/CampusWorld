'use strict';

/**
 * jirun-domain 公共模块入口。
 *
 * 这里只放可脱离 uniCloud 运行、可在 Node 下直接测试的纯规则函数。
 * 涉及数据库、存储与 IM 的实现放在云对象中，通过依赖注入使用本模块。
 */

module.exports = {
	...require('./contact-policy.js'),
	...require('./content-policy.js'),
	...require('./profile-policy.js'),
	...require('./validation.js'),
	...require('./content-repository.js'),
	...require('./content-service.js'),
	...require('./cloud-response.js'),
	...require('./actor-policy.js')
};
