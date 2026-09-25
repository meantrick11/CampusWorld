<template>
	<view class="page">
		<view class="banner">
			<text class="banner-title">我的</text>
			<text class="banner-tag">开发样板</text>
		</view>
		<view class="card">
			<text class="card-title">本页尚未实现</text>
			<text class="card-desc">按实施计划 T10 实现，届时包含：个人资料、我的发布、校园墙收藏与关注、黑名单、规则说明、反馈与退出登录。平台无钱包、积分和会员入口。</text>
		</view>
		<view class="card">
			<text class="card-title">账号</text>
			<text class="card-desc">登录沿用 uni-id-pages 提供的官方登录流程；是否已登录由服务端 token 校验决定。</text>
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
		margin-bottom: 24rpx;
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
