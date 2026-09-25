import { getInteractionSummary, setReaction } from '@/services/social.js'

/**
 * 校园墙互动的页面混入：批量取计数、点赞与收藏、评论入口、分享。
 *
 * 分享说明：小程序里由 `open-type="share"` 触发页面自身的 onShareAppMessage，
 * 分享的是原内容路径而不是站内转发帖；重新访问时服务端仍会校验可见性，
 * 下架或删除的内容不会被分享链接绕开。
 */
export default {
	data() {
		return {
			summaries: {},
			shareTarget: null
		}
	},
	methods: {
		/** 批量取互动计数，失败不阻塞列表展示。 */
		async loadSummaries(items) {
			const contentIds = items.filter((item) => item.kind === 'wall').map((item) => item.id)
			if (!contentIds.length) return
			try {
				const result = await getInteractionSummary({ contentIds })
				this.summaries = { ...this.summaries, ...result.data }
			} catch (error) {
				// 计数是次要信息，取不到时保留默认值
			}
		},
		summaryOf(id) {
			return this.summaries[id] || {
				likes: 0,
				comments: 0,
				favorites: 0,
				liked: false,
				favorited: false
			}
		},
		async toggleReaction({ contentId, type, enabled }) {
			try {
				const result = await setReaction({ contentId, type, enabled })
				const current = this.summaryOf(contentId)
				const patch = type === 'like' ? {
					likes: result.data.count,
					liked: result.data.enabled
				} : {
					favorites: result.data.count,
					favorited: result.data.enabled
				}
				this.summaries = {
					...this.summaries,
					[contentId]: { ...current, ...patch }
				}
				if (result.localSample) {
					uni.showToast({
						title: '本地样例：状态仅存于本机',
						icon: 'none'
					})
				}
			} catch (error) {
				uni.showToast({
					title: error.message,
					icon: 'none'
				})
			}
		},
		openComments(item) {
			uni.navigateTo({
				url: `/pages/content/detail?id=${item.id}&focus=comment`
			})
		},
		async shareContent(item) {
			this.shareTarget = item
			// #ifdef MP-WEIXIN
			// 小程序由 open-type="share" 唤起原生转发，这里无需额外动作
			// #endif
			// #ifndef MP-WEIXIN
			const link = `${location.origin}${location.pathname}#/pages/content/detail?id=${item.id}`
			uni.setClipboardData({
				data: link,
				success: () => uni.showToast({
					title: '分享链接已复制',
					icon: 'none'
				})
			})
			// #endif
		},
		onShareAppMessage() {
			const item = this.shareTarget
			if (!item) {
				return {
					title: '暨快跑 · 校园信息',
					path: '/pages/plaza/index'
				}
			}
			const title = item.title || item.body || '暨快跑 · 校园墙'
			return {
				title: title.slice(0, 30),
				path: `/pages/content/detail?id=${item.id}`
			}
		}
	}
}
