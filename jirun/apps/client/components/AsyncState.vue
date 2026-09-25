<template>
	<view class="async-state">
		<!-- 加载中 -->
		<view v-if="loading" class="box">
			<view class="spinner"></view>
			<text class="hint">{{ loadingText }}</text>
		</view>

		<!-- 失败：只有依赖或网络失败才提供重试，业务拒绝不循环重试 -->
		<view v-else-if="error" class="box">
			<text class="title">加载失败</text>
			<text class="hint">{{ error }}</text>
			<view v-if="retryable" class="retry" @click="$emit('retry')">
				<text class="retry-text">重试</text>
			</view>
		</view>

		<!-- 空数据 -->
		<view v-else-if="empty" class="box">
			<text class="title">{{ emptyTitle }}</text>
			<text class="hint">{{ emptyHint }}</text>
			<slot name="empty-action"></slot>
		</view>

		<!-- 有数据 -->
		<slot v-else></slot>
	</view>
</template>

<script>
	export default {
		name: 'AsyncState',
		props: {
			loading: {
				type: Boolean,
				default: false
			},
			error: {
				type: String,
				default: ''
			},
			// 依赖或网络失败可以重试；业务拒绝（如无权限）不应重试
			retryable: {
				type: Boolean,
				default: false
			},
			empty: {
				type: Boolean,
				default: false
			},
			emptyTitle: {
				type: String,
				default: '暂无内容'
			},
			emptyHint: {
				type: String,
				default: ''
			},
			loadingText: {
				type: String,
				default: '加载中'
			}
		},
		emits: ['retry']
	}
</script>

<style lang="scss" scoped>
	.async-state {
		width: 100%;
	}

	.box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 96rpx 32rpx;
	}

	.spinner {
		width: 44rpx;
		height: 44rpx;
		border: 4rpx solid $jr-border;
		border-top-color: $jr-primary;
		border-radius: 50%;
		animation: jr-spin 0.8s linear infinite;
		margin-bottom: 20rpx;
	}

	@keyframes jr-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.title {
		font-size: $jr-font-body;
		color: $jr-text-main;
		margin-bottom: 8rpx;
	}

	.hint {
		font-size: 26rpx;
		color: $jr-text-sub;
		text-align: center;
		line-height: 1.6;
	}

	.retry {
		margin-top: 32rpx;
		min-width: 200rpx;
		height: $jr-tap-min;
		padding: 0 40rpx;
		border-radius: $jr-radius-btn;
		background-color: $jr-primary;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.retry-text {
		color: #FFFFFF;
		font-size: $jr-font-body;
	}
</style>
