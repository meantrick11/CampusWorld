<template>
	<view class="page">
		<view class="result">
			<view class="mark" :class="`mark--${tone}`">
				<text class="mark-text">{{ markText }}</text>
			</view>
			<text class="title">{{ title }}</text>
			<text class="explain">{{ explain }}</text>
		</view>

		<view class="actions">
			<view class="action action--primary" @click="goMine">
				<text class="action-text action-text--primary">查看我的发布</text>
			</view>
			<view class="action" @click="goPlaza">
				<text class="action-text">返回广场</text>
			</view>
		</view>

		<view class="note">
			<text class="note-text">待处理不等于已公开。审核结果会体现在「我的发布」里，通过后才会出现在广场。</text>
		</view>
	</view>
</template>

<script>
	import { VISIBILITY_EXPLAIN } from '@/utils/status.js'

	export default {
		data() {
			return {
				visibility: 'pending'
			}
		},
		computed: {
			title() {
				return this.visibility === 'published' ? '已公开' : '已提交，待处理'
			},
			explain() {
				return VISIBILITY_EXPLAIN[this.visibility] || VISIBILITY_EXPLAIN.pending
			},
			markText() {
				return this.visibility === 'published' ? '✓' : '…'
			},
			tone() {
				return this.visibility === 'published' ? 'success' : 'pending'
			}
		},
		onLoad(query) {
			this.visibility = query.visibility || 'pending'
			uni.setNavigationBarTitle({ title: this.title })
		},
		methods: {
			goMine() {
				uni.redirectTo({ url: '/pages/mine/publications' })
			},
			goPlaza() {
				uni.switchTab({ url: '/pages/plaza/index' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
		padding: 24rpx;
	}

	.result {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 64rpx 32rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.mark {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 28rpx;
	}

	.mark--success {
		background-color: rgba(46, 158, 107, 0.12);
	}

	.mark--pending {
		background-color: rgba(217, 131, 36, 0.12);
	}

	.mark-text {
		font-size: 52rpx;
		color: $jr-primary;
	}

	.title {
		font-size: 38rpx;
		font-weight: 600;
		color: $jr-text-main;
		margin-bottom: 16rpx;
	}

	.explain {
		font-size: 28rpx;
		color: $jr-text-sub;
		line-height: 1.7;
		text-align: center;
	}

	.actions {
		margin-top: 32rpx;
	}

	.action {
		height: 96rpx;
		border-radius: $jr-radius-btn;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20rpx;
		background-color: $jr-card-bg;
	}

	.action--primary {
		background-color: $jr-primary;
	}

	.action-text {
		font-size: 32rpx;
		color: $jr-text-main;
	}

	.action-text--primary {
		color: #FFFFFF;
	}

	.note {
		padding: 16rpx 8rpx;
	}

	.note-text {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.7;
	}
</style>
