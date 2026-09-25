/**
 * 仅用于本地 H5 预览的 uniCloud 占位实现。
 *
 * 为什么需要它：apps/client/common/appInit.js 在模块顶层就执行 `uniCloud.database()`。
 * 只有关联了 uniCloud 服务空间时，H5 运行环境才存在 uniCloud 对象；本机没有服务空间，
 * 因此不注入占位就会在启动阶段抛 `uniCloud is not defined`，页面无法挂载。
 *
 * 这不是云能力的实现，也不是 mock 数据：
 * 任何真实调用都会抛出「需要真实服务空间」的明确错误，不会返回假数据，
 * 因此它只用于查看界面布局，绝不能据此判断业务功能是否可用。
 * 该文件不进入正式产物，也不参与发布。
 */
(function () {
	if (globalThis.uniCloud) return;

	function notConnected(name) {
		return function () {
			return Promise.reject(new Error('预览环境未连接 uniCloud，' + name + ' 需要真实服务空间'));
		};
	}

	function createQuery() {
		const query = {};
		const chain = function () {
			return query;
		};
		['where', 'orderBy', 'limit', 'skip', 'field'].forEach(function (method) {
			query[method] = chain;
		});
		query.get = notConnected('database.get');
		query.count = notConnected('database.count');
		query.add = notConnected('database.add');
		query.update = notConnected('database.update');
		query.remove = notConnected('database.remove');
		query.set = notConnected('database.set');
		query.doc = chain;
		return query;
	}

	function database() {
		return {
			collection: function () {
				return createQuery();
			},
			command: {
				in: function (value) {
					return value;
				},
				eq: function (value) {
					return value;
				},
				neq: function (value) {
					return value;
				},
				gt: function (value) {
					return value;
				},
				lt: function (value) {
					return value;
				},
				inc: function (value) {
					return value;
				},
				exists: function (value) {
					return value;
				},
				or: function (value) {
					return value;
				},
				and: function (value) {
					return value;
				}
			},
			on: function () {},
			off: function () {}
		};
	}

	function importObject(name) {
		return new Proxy(
			{},
			{
				get: function () {
					return notConnected(name);
				}
			}
		);
	}

	globalThis.uniCloud = {
		database: database,
		importObject: importObject,
		interceptObject: function () {},
		callFunction: notConnected('callFunction'),
		getCurrentUserInfo: notConnected('getCurrentUserInfo'),
		on: function () {},
		off: function () {}
	};
})();
