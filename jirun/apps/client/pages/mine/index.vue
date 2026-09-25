<template>
	<view class="page">
		<view class="banner">
			<text class="banner-title">我的</text>
			<text class="banner-tag">开发样板</text>
		</view>

		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="card">
			<view class="row" v-for="entry in entries" :key="entry.key" @click="open(entry)">
				<text class="row-name">{{ entry.name }}</text>
				<text class="row-arrow">›</text>
			</view>
		</view>

		<view class="card">
			<text class="card-title">说明</text>
			<text class="card-desc">平台完全免费，本页没有余额、钱包、积分或会员入口。资料、收藏、通知、黑名单与设置将在 T10 补齐。</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				// T06 已实现的入口直接可用，其余入口明确标注待实现
				entries: [{
						key: 'publications',
						name: '我的发布',
						url: '/pages/mine/publications'
					},
					{
						key: 'publish',
						name: '发布新信息',
						url: '/pages/publish/select'
					},
					{
						key: 'cases',
						name: '举报与处理记录',
						url: '/pages/report/history'
					},
					{
						key: 'favorites',
						name: '收藏与关注（待实现）',
						url: ''
					},
					{
						key: 'profile',
						name: '个人资料（待实现）',
						url: ''
					},
					{
						key: 'blocked',
						name: '黑名单（待实现）',
						url: ''
					},
					{
						key: 'settings',
						name: '设置',
						url: '/pages/ucenter/settings/settings'
					}
				],
				localSample: false
			}
		},
		onShow() {
			// 「我的」在无云端时也走样例分支，此处只做标识，不伪造数据
			this.localSample = typeof __JIRUN_PREVIEW__ !== 'undefined' && __JIRUN_PREVIEW__ === true
		},
		methods: {
			open(entry) {
				if (!entry.url) {
					uni.showToast({
						title: '该功能将在后续任务实现',
						icon: 'none'
					})
					return
				}
				uni.navigateTo({ url: entry.url })
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

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		border-radius: $jr-radius-tag;
		padding: 14rpx 20rpx;
		margin-bottom: 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 8rpx 26rpx;
		margin-bottom: 24rpx;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.row-arrow {
		color: $jr-text-placeholder;
		font-size: 40rpx;
	}

	.card-title {
		display: block;
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		padding-top: 20rpx;
		margin-bottom: 12rpx;
	}

	.card-desc {
		display: block;
		font-size: $jr-font-body;
		color: $jr-text-sub;
		line-height: 1.6;
		padding-bottom: 20rpx;
	}
</style>
