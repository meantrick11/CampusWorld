<template>
	<view class="page">
		<view class="banner">
			<text class="banner-title">消息</text>
			<text class="banner-tag">开发样板</text>
		</view>
		<view class="card">
			<text class="card-title">本页尚未实现</text>
			<text class="card-desc">按实施计划 T08、T10 实现，届时包含：私聊会话列表、对方未回复前的发送限制提示、拉黑状态，以及站内通知入口。</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
		padding: 24rpx;
	}

	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8rpx 8rpx 24rpx;
	}

	.banner-title {
		font-size: 44rpx;
		font-weight: 600;
		color: $jr-text-main;
	}

	.banner-tag {
		font-size: 22rpx;
		color: $jr-primary;
		background-color: $jr-primary-light;
		border-radius: $jr-radius-btn;
		padding: 4rpx 18rpx;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 28rpx;
	}

	.card-title {
		display: block;
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		margin-bottom: 12rpx;
	}

	.card-desc {
		font-size: $jr-font-body;
		color: $jr-text-sub;
		line-height: 1.6;
	}
</style>
