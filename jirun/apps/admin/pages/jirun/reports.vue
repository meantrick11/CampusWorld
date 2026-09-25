<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="toolbar">
			<text class="toolbar-title">待处理举报</text>
			<text class="toolbar-hint">提交举报不改变内容可见性；只有判定成立才会下架</text>
		</view>

		<view v-if="!items.length" class="empty">
			<text class="empty-text">当前没有待处理举报</text>
		</view>

		<view class="item" v-for="item in items" :key="item.targetId">
			<view class="item-head">
				<text class="kind">{{ item.reportType === 'comment' ? '举报评论' : item.reportType === 'user' ? '举报用户' : '举报信息' }}</text>
				<text class="author">举报人 {{ item.reporterId }}</text>
			</view>
			<text class="reason">原因：{{ reasonLabel(item.reason) }}</text>
			<text class="body" v-if="item.description">说明：{{ item.description }}</text>
			<text class="target">被举报对象：{{ item.reportedId }}</text>

			<view class="ops">
				<text class="op op--danger" @click="act(item, 'uphold')">举报成立并下架</text>
				<text class="op" @click="act(item, 'reject')">举报不成立</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { listQueue, decide } from '@/services/jirun-admin.js'

	const REASON_TEXT = {
		spam: '重复或垃圾信息',
		fraud: '疑似诈骗',
		harassment: '骚扰或攻击他人',
		illegal: '违法违规内容',
		false_info: '信息不实',
		other: '其他'
	}

	export default {
		data() {
			return {
				items: [],
				localSample: false
			}
		},
		onLoad() {
			this.load()
		},
		methods: {
			async load() {
				try {
					const result = await listQueue({ queue: 'report', limit: 20 })
					this.items = result.data.items
					this.localSample = Boolean(result.localSample)
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			reasonLabel(reason) {
				return REASON_TEXT[reason] || reason
			},
			act(item, action) {
				uni.showModal({
					title: action === 'uphold' ? '确认举报成立' : '填写不成立理由',
					editable: action !== 'uphold',
					content: action === 'uphold' ? '成立后将对被举报内容执行下架，并通知作者原因。' : '',
					placeholderText: action === 'uphold' ? '' : '理由会展示给作者',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await decide({
								targetType: 'report',
								targetId: item.targetId,
								action,
								reason: res.content || (action === 'uphold' ? '举报成立' : '')
							})
							uni.showToast({
								title: '已处理',
								icon: 'none'
							})
							this.load()
						} catch (error) {
							uni.showToast({
								title: error.message,
								icon: 'none'
							})
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		padding: 20px;
		background-color: #F6F8F7;
		min-height: 100vh;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 8px 12px;
		border-radius: 4px;
		margin-bottom: 16px;
	}

	.sample-text {
		font-size: 12px;
		color: #D98324;
	}

	.toolbar {
		margin-bottom: 16px;
	}

	.toolbar-title {
		display: block;
		font-size: 16px;
		color: #172B26;
	}

	.toolbar-hint {
		display: block;
		font-size: 12px;
		color: #5F706A;
		margin-top: 4px;
	}

	.empty {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 40px;
		text-align: center;
	}

	.empty-text {
		font-size: 13px;
		color: #5F706A;
	}

	.item {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 16px;
	}

	.item-head {
		display: flex;
		justify-content: space-between;
	}

	.kind {
		font-size: 13px;
		color: #147D64;
	}

	.author {
		font-size: 12px;
		color: #5F706A;
	}

	.reason {
		display: block;
		font-size: 13px;
		color: #172B26;
		margin-top: 10px;
	}

	.body {
		display: block;
		font-size: 13px;
		color: #5F706A;
		line-height: 1.7;
		margin-top: 6px;
	}

	.target {
		display: block;
		font-size: 12px;
		color: #9AA8A3;
		margin-top: 8px;
	}

	.ops {
		display: flex;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid #E3E8E6;
	}

	.op {
		font-size: 13px;
		color: #5F706A;
		margin-right: 24px;
	}

	.op--danger {
		color: #C0392B;
	}
</style>
