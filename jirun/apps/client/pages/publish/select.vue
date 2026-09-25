<template>
	<view class="page">
		<view class="intro">
			<text class="intro-title">选择要发布的信息类型</text>
			<text class="intro-desc">发布完全免费。平台不收取发布费、服务费或抽成，也不介入交易与交付。</text>
		</view>
		<view class="entry" v-for="board in boards" :key="board.key" @click="choose(board.key)">
			<view class="entry-main">
				<text class="entry-name">{{ board.name }}</text>
				<text class="entry-desc">{{ board.desc }}</text>
			</view>
			<text class="entry-arrow">›</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				boards: [{
						key: 'delivery',
						name: '取送需求',
						desc: '代取快递、代送物品，可协商报酬'
					},
					{
						key: 'idle',
						name: '闲置转让',
						desc: '转让或赠送闲置物品'
					},
					{
						key: 'wanted',
						name: '求购',
						desc: '发布想要求购的物品'
					},
					{
						key: 'wall',
						name: '校园墙',
						desc: '图文或视频动态'
					}
				]
			}
		},
		methods: {
			choose(kind) {
				uni.navigateTo({
					url: `/pages/publish/edit?kind=${kind}`
				})
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

	.intro {
		padding: 8rpx 8rpx 28rpx;
	}

	.intro-title {
		display: block;
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		margin-bottom: 10rpx;
	}

	.intro-desc {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.6;
	}

	.entry {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 32rpx 28rpx;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
		min-height: $jr-tap-min;
	}

	.entry-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.entry-name {
		font-size: 32rpx;
		color: $jr-text-main;
		font-weight: 600;
	}

	.entry-desc {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-top: 6rpx;
	}

	.entry-arrow {
		color: $jr-text-placeholder;
		font-size: 44rpx;
	}
</style>
