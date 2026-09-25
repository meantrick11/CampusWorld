<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="tabs">
			<text class="tab" :class="{ 'tab--active': tab === item.key }" v-for="item in tabs" :key="item.key"
				@click="tab = item.key">{{ item.name }}</text>
		</view>

		<view class="list">
			<async-state :loading="loading" :error="error" :retryable="retryable"
				:empty="!loading && !error && !items.length" empty-title="还没有相关记录"
				empty-hint="提交举报或收到处理决定后，会显示在这里" @retry="load">
				<view class="card" v-for="item in items" :key="item.key">
					<view class="card-head">
						<text class="card-title">{{ titleOf(item) }}</text>
						<text class="badge" :class="`badge--${toneOf(item)}`">{{ statusOf(item) }}</text>
					</view>

					<text class="reason" v-if="item.reason">原因：{{ reasonLabel(item.reason) }}</text>
					<text class="time">{{ formatTime(item.createdAt) }}</text>

					<!-- 只有针对内容的下架决定才能申请复核 -->
					<view class="ops" v-if="item.decisionId && item.targetType === 'content'">
						<text class="op" @click="startAppeal(item)">申请复核</text>
					</view>
				</view>
			</async-state>
		</view>

		<view class="note">
			<text class="note-text">复核是申请，不代表会自动恢复展示。作者本人删除的内容不能通过复核恢复。</text>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import { formatTime } from '@/utils/format.js'
	import { listMyCases, appeal, reasonLabel } from '@/services/moderation.js'

	export default {
		components: {
			AsyncState
		},
		data() {
			return {
				tabs: [{
						key: 'all',
						name: '全部'
					},
					{
						key: 'report',
						name: '我的举报'
					},
					{
						key: 'decision',
						name: '处理结果'
					}
				],
				tab: 'all',
				items: [],
				loading: false,
				error: '',
				retryable: false,
				localSample: false
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			formatTime,
			reasonLabel,
			async load() {
				this.loading = true
				this.error = ''
				try {
					const result = await listMyCases({ limit: 20 })
					this.localSample = Boolean(result.localSample)
					this.items = result.data.items
				} catch (error) {
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = error.message
				} finally {
					this.loading = false
				}
			},
			titleOf(item) {
				if (item.reportId) return `举报${item.targetType === 'comment' ? '评论' : '信息'}`
				return { remove: '内容被下架', approve: '内容通过审核', reject: '内容未通过审核', restore: '内容已恢复' } [
					item.action] || '处理决定'
			},
			statusOf(item) {
				if (item.reportId) {
					return { submitted: '处理中', upheld: '已成立', rejected: '未成立' } [item.status] || item.status
				}
				return '已处理'
			},
			toneOf(item) {
				if (item.reportId) return item.status === 'upheld' ? 'success' : 'warn'
				return item.action === 'remove' ? 'danger' : 'success'
			},
			startAppeal(item) {
				uni.showModal({
					title: '申请复核',
					editable: true,
					placeholderText: '说明你认为处理有误的理由',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await appeal({
								decisionId: item.decisionId,
								explanation: res.content || ''
							})
							uni.showToast({
								title: '已提交复核申请',
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
		min-height: 100vh;
		background-color: $jr-page-bg;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 14rpx 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.tabs {
		display: flex;
		background-color: $jr-card-bg;
		padding: 0 24rpx;
	}

	.tab {
		font-size: 28rpx;
		color: $jr-text-sub;
		margin-right: 40rpx;
		height: 80rpx;
		line-height: 80rpx;
	}

	.tab--active {
		color: $jr-primary;
		font-weight: 600;
		border-bottom: 4rpx solid $jr-primary;
	}

	.list {
		padding: 24rpx;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 26rpx;
		margin-bottom: 24rpx;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.card-title {
		font-size: $jr-font-body;
		color: $jr-text-main;
	}

	.badge {
		font-size: $jr-font-small;
		padding: 2rpx 14rpx;
		border-radius: $jr-radius-tag;
	}

	.badge--success {
		color: $jr-success;
		background-color: rgba(46, 158, 107, 0.12);
	}

	.badge--warn {
		color: $jr-warning;
		background-color: rgba(217, 131, 36, 0.12);
	}

	.badge--danger {
		color: $jr-danger;
		background-color: rgba(192, 57, 43, 0.1);
	}

	.reason {
		display: block;
		font-size: 26rpx;
		color: $jr-text-sub;
		margin-top: 12rpx;
	}

	.time {
		display: block;
		font-size: 22rpx;
		color: $jr-text-placeholder;
		margin-top: 8rpx;
	}

	.ops {
		margin-top: 18rpx;
		padding-top: 16rpx;
		border-top: 1rpx solid $jr-border;
	}

	.op {
		font-size: 26rpx;
		color: $jr-primary;
	}

	.note {
		padding: 0 32rpx 40rpx;
	}

	.note-text {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.8;
	}
</style>
