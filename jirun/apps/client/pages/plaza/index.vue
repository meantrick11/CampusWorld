<template>
	<view class="page">
		<view class="banner">
			<text class="banner-title">广场</text>
			<text class="banner-tag">开发样板</text>
		</view>
		<view class="card">
			<text class="card-title">本页尚未实现</text>
			<text class="card-desc">按实施计划 T06 实现，届时包含：取送信息单列、闲置信息双列、求购信息单列、校园墙内容流，以及独立的发布入口。</text>
		</view>
		<view class="card">
			<text class="card-title">板块</text>
			<view class="row" v-for="item in boards" :key="item.key">
				<text class="row-name">{{ item.name }}</text>
				<text class="row-desc">{{ item.desc }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				boards: [{
						key: 'delivery',
						name: '取送',
						desc: '代取快递、代送物品'
					},
					{
						key: 'idle',
						name: '闲置',
						desc: '转让、赠送闲置物品'
					},
					{
						key: 'wanted',
						name: '求购',
						desc: '发布求购需求'
					},
					{
						key: 'wall',
						name: '校园墙',
						desc: '图文视频与互动'
					}
				]
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

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: $jr-tap-min;
		border-bottom: 1rpx solid $jr-border;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-name {
		font-size: $jr-font-body;
		color: $jr-text-main;
	}

	.row-desc {
		font-size: 24rpx;
		color: $jr-text-sub;
	}
</style>
