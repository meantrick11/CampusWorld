// 应用配置，App.vue 挂载到 getApp().globalData.config
// 说明：平台完全免费，不提供 App 下载、应用市场评分或任何付费入口。
export default {
	"about": {
		//应用名称
		"appName": "暨快跑",
		//应用 logo
		"logo": "/static/logo.png",
		//运营主体
		"company": "",
		//标语
		"slogan": "纯公益校园信息发布平台",
		//应用版本，仅非 App 端展示
		"version": "1.0.0"
	},
	"mp": {
		"weixin": {
			//微信小程序原始 id，用于分享
			"id": ""
		}
	},
	//多语言：默认关闭
	"i18n": {
		"enable": false
	}
}
