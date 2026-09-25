<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<!-- 板块与状态筛选 -->
		<view class="filters">
			<text class="filter" :class="{ 'filter--active': kind === item.key }" v-for="item in kindOptions"
				:key="item.key" @click="switchKind(item.key)">{{ item.name }}</text>
		</view>

		<view class="list-area">
			<async-state :loading="loading" :error="error" :retryable="retryable"
				:empty="!loading && !error && !items.length" empty-title="还没有发布过信息"
				empty-hint="发布后再回到这里维护" @retry="load">
				<view class="card" v-for="item in items" :key="item.id">
					<!-- 审核状态与供需状态分开显示，避免把两件事混成一句 -->
					<view class="card-head">
						<text class="card-title">{{ cardTitle(item) }}</text>
						<status-badge :status="item.visibility" scope="review"></status-badge>
					</view>
					<view class="card-meta">
						<text class="meta-text">{{ kindName(item.kind) }}</text>
						<status-badge v-if="item.businessStatus" :status="item.businessStatus"></status-badge>
					</view>
					<text class="card-sub" v-if="summary(item)">{{ summary(item) }}</text>

					<view class="menu">
						<text class="menu-item" @click="edit(item)">编辑</text>
						<text class="menu-item" v-if="item.kind === 'idle'" @click="changeQuantity(item)">更新数量</text>
						<text class="menu-item" v-if="item.businessStatus" @click="markProgress(item)">标记进展</text>
						<text class="menu-item" v-if="item.businessStatus" @click="close(item)">关闭</text>
						<text class="menu-item menu-item--danger" @click="remove(item)">删除</text>
					</view>
				</view>
			</async-state>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import StatusBadge from '@/components/StatusBadge.vue'
	import { listMine, updateStatus, deleteContent } from '@/services/content.js'
	import { formatAmount } from '@/utils/format.js'

	export default {
		components: {
			AsyncState,
			StatusBadge
		},
		data() {
			return {
				kind: 'all',
				kindOptions: [{
						key: 'all',
						name: '全部'
					},
					{
						key: 'delivery',
						name: '取送'
					},
					{
						key: 'idle',
						name: '闲置'
					},
					{
						key: 'wanted',
						name: '求购'
					},
					{
						key: 'wall',
						name: '校园墙'
					}
				],
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
			async load() {
				this.loading = true
				this.error = ''
				try {
					const result = await listMine({
						kind: this.kind === 'all' ? undefined : this.kind,
						limit: 20
					})
					this.localSample = Boolean(result.localSample)
					this.items = result.items
				} catch (error) {
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = error.message
				} finally {
					this.loading = false
				}
			},
			switchKind(key) {
				if (this.kind === key) return
				this.kind = key
				this.load()
			},
			kindName(key) {
				const found = this.kindOptions.find((item) => item.key === key)
				return found ? found.name : key
			},
			cardTitle(item) {
				return item.title || '校园墙动态'
			},
			summary(item) {
				const details = item.details || {}
				if (item.kind === 'idle') {
					const price = details.priceType === 'amount' ? `¥ ${formatAmount(details.amountFen)}` :
						details.priceType === 'free' ? '免费赠送' : '面议'
					return `${price} · 剩余 ${details.remainingQuantity} 件`
				}
				if (item.kind === 'wanted') {
					const budget = details.budgetType === 'amount' ? `¥ ${formatAmount(details.budgetFen)}` : '面议'
					return `还需要 ${details.neededQuantity} 件 · 预算 ${budget}`
				}
				if (item.kind === 'delivery') {
					return `${details.fromRegion} → ${details.toRegion}`
				}
				return ''
			},
			edit(item) {
				uni.navigateTo({ url: `/pages/publish/edit?kind=${item.kind}&id=${item.id}` })
			},
			changeQuantity(item) {
				const details = item.details || {}
				uni.showModal({
					title: '更新剩余数量',
					editable: true,
					placeholderText: `当前 ${details.remainingQuantity} 件`,
					success: (res) => {
						if (!res.confirm) return
						const value = Number(res.content)
						if (!Number.isInteger(value) || value < 0) {
							uni.showToast({
								title: '请输入不小于 0 的整数',
								icon: 'none'
							})
							return
						}
						this.commitStatus(item, {
							remainingQuantity: value
						}, '数量已更新')
					}
				})
			},
			markProgress(item) {
				const next = {
					delivery: [
						['contacted', '已联系'],
						['completed', '已完成']
					],
					idle: [
						['sold', '已售出'],
						['gifted', '已赠出']
					],
					wanted: [
						['fulfilled', '已求得']
					]
				} [item.kind] || []
				if (!next.length) return
				uni.showActionSheet({
					itemList: next.map((entry) => entry[1]),
					success: (res) => {
						this.commitStatus(item, {
							status: next[res.tapIndex][0]
						}, '状态已更新')
					}
				})
			},
			close(item) {
				uni.showModal({
					title: '关闭这条信息',
					content: '关闭后不再出现在广场的有效列表中，已有的私聊会话不受影响。',
					success: (res) => {
						if (res.confirm) this.commitStatus(item, {
							status: 'closed'
						}, '已关闭')
					}
				})
			},
			async commitStatus(item, patch, toast) {
				try {
					await updateStatus({
						id: item.id,
						expectedVersion: item.version,
						...patch,
						requestId: `mine-${item.id}-${Date.now()}`
					})
					uni.showToast({
						title: toast,
						icon: 'none'
					})
					this.load()
				} catch (error) {
					if (error.code === 'VERSION_CONFLICT') this.load()
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			remove(item) {
				uni.showModal({
					title: '确认删除',
					// 删除会影响公开展示，必须让作者知道
					content: '删除后这条信息会从广场和你的列表中移除，其他人再也看不到，也无法通过分享链接访问。删除不能恢复。',
					confirmText: '删除',
					confirmColor: '#C0392B',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await deleteContent({
								id: item.id,
								expectedVersion: item.version,
								requestId: `del-${item.id}-${Date.now()}`
							})
							uni.showToast({
								title: '已删除',
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

	.filters {
		display: flex;
		flex-wrap: wrap;
		padding: 20rpx 24rpx 0;
	}

	.filter {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		background-color: $jr-card-bg;
		border-radius: $jr-radius-btn;
		padding: 8rpx 24rpx;
		margin: 0 16rpx 16rpx 0;
	}

	.filter--active {
		color: #FFFFFF;
		background-color: $jr-primary;
	}

	.list-area {
		padding: 8rpx 24rpx 40rpx;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 26rpx;
		margin-bottom: 24rpx;
	}

	.card-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.card-title {
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		flex: 1;
		margin-right: 16rpx;
		@include jr-ellipsis-lines(2);
	}

	.card-meta {
		display: flex;
		align-items: center;
		margin-top: 10rpx;
	}

	.meta-text {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-right: 16rpx;
	}

	.card-sub {
		display: block;
		font-size: 26rpx;
		color: $jr-text-sub;
		margin-top: 10rpx;
	}

	.menu {
		display: flex;
		flex-wrap: wrap;
		margin-top: 20rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid $jr-border;
	}

	.menu-item {
		font-size: 26rpx;
		color: $jr-primary;
		margin-right: 36rpx;
		height: 60rpx;
		line-height: 60rpx;
	}

	.menu-item--danger {
		color: $jr-danger;
	}
</style>
