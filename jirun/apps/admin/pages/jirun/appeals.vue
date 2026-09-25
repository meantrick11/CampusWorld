<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="toolbar">
			<text class="toolbar-title">待处理复核</text>
			<text class="toolbar-hint">受理不代表自动恢复；作者本人已删除的内容不能通过复核恢复</text>
		</view>

		<view v-if="!items.length" class="empty">
			<text class="empty-text">当前没有待处理复核</text>
		</view>

		<view class="item" v-for="item in items" :key="item.targetId">
			<view class="item-head">
				<text class="kind">复核申请</text>
				<text class="author">申请人 {{ item.appellantId }}</text>
			</view>
			<text class="body" v-if="item.explanation">说明：{{ item.explanation }}</text>
			<text class="target">对应决定：{{ item.decisionId }}</text>
			<text class="target">涉及内容：{{ item.contentId }}</text>

			<view class="ops">
				<text class="op op--primary" @click="act(item, 'approve')">复核通过并恢复</text>
				<text class="op" @click="act(item, 'reject')">复核不通过</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { listQueue, decide } from '@/services/jirun-admin.js'

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
					const result = await listQueue({ queue: 'appeal', limit: 20 })
					this.items = result.data.items
					this.localSample = Boolean(result.localSample)
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			act(item, action) {
				uni.showModal({
					title: action === 'approve' ? '确认复核通过' : '填写不通过理由',
					editable: action !== 'approve',
					content: action === 'approve' ?
						'通过后会恢复公开显示；若作者已删除该内容，系统会拒绝恢复。' : '',
					placeholderText: action === 'approve' ? '' : '理由会展示给申请人',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await decide({
								targetType: 'appeal',
								targetId: item.targetId,
								action,
								reason: res.content || (action === 'approve' ? '复核通过' : '')
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

	.body {
		display: block;
		font-size: 13px;
		color: #172B26;
		line-height: 1.7;
		margin-top: 10px;
	}

	.target {
		display: block;
		font-size: 12px;
		color: #9AA8A3;
		margin-top: 6px;
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

	.op--primary {
		color: #147D64;
	}
</style>
