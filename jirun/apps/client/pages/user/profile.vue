<template>
	<view class="page">
		<view class="header">
			<view class="avatar">
				<text class="avatar-text">{{ userId.slice(0, 1) }}</text>
			</view>
			<view class="info">
				<text class="name">{{ userId }}</text>
				<text class="meta">{{ state.followers }} 位关注者</text>
			</view>
			<view class="follow" :class="{ 'follow--on': state.following }" @click="toggleFollow">
				<text class="follow-text">{{ state.following ? '已关注' : '关注' }}</text>
			</view>
		</view>

		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="section">
			<text class="section-title">公开内容</text>
			<async-state :loading="loading" :error="error" :retryable="retryable"
				:empty="!loading && !error && !items.length" empty-title="还没有公开内容"
				empty-hint="对方发布的信息会出现在这里" @retry="load">
				<content-card class="item" v-for="item in items" :key="item.id" :item="item" :variant="item.kind"
					@open="openDetail"></content-card>
			</async-state>
		</view>

		<view class="note">
			<text class="note-text">公开主页只展示昵称、头像与已公开内容；不展示私聊、举报记录或取件信息。</text>
			<text class="note-text">关注不会解锁私聊：私聊额度由服务端单独判定。</text>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import ContentCard from '@/components/ContentCard.vue'
	import { listPublic } from '@/services/content.js'
	import { getProfileState, setFollow } from '@/services/social.js'

	export default {
		components: {
			AsyncState,
			ContentCard
		},
		data() {
			return {
				userId: '',
				state: { following: false, followers: 0 },
				items: [],
				loading: false,
				error: '',
				retryable: false,
				localSample: false
			}
		},
		onLoad(query) {
			this.userId = query.userId || ''
			this.load()
			this.loadState()
		},
		methods: {
			async load() {
				this.loading = true
				this.error = ''
				try {
					// 公开主页只展示该用户的公开内容；服务端仍会按可见性过滤
					const result = await listPublic({ limit: 20 })
					this.localSample = Boolean(result.localSample)
					this.items = result.items.filter((item) => item.author && item.author.userId === this.userId)
				} catch (error) {
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = error.message
				} finally {
					this.loading = false
				}
			},
			async loadState() {
				try {
					const result = await getProfileState({ userId: this.userId })
					this.state = result.data
				} catch (error) {
					// 关注状态取不到不阻塞内容展示
					this.state = { following: false, followers: 0 }
				}
			},
			async toggleFollow() {
				try {
					const result = await setFollow({
						userId: this.userId,
						// 传入明确的目标状态，不做 toggle
						enabled: !this.state.following
					})
					this.state = {
						...this.state,
						following: result.data.enabled,
						followers: result.data.followers
					}
					uni.showToast({
						title: result.localSample ? '本地样例：关注状态仅存于本机' : (result.data.enabled ? '已关注' : '已取消关注'),
						icon: 'none'
					})
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			openDetail(item) {
				uni.navigateTo({ url: `/pages/content/detail?id=${item.id}` })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
	}

	.header {
		display: flex;
		align-items: center;
		background-color: $jr-card-bg;
		padding: 32rpx 24rpx;
	}

	.avatar {
		width: 112rpx;
		height: 112rpx;
		border-radius: 50%;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 24rpx;
	}

	.avatar-text {
		font-size: 44rpx;
		color: $jr-primary;
		font-weight: 600;
	}

	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.name {
		font-size: 36rpx;
		font-weight: 600;
		color: $jr-text-main;
	}

	.meta {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-top: 8rpx;
	}

	.follow {
		height: 68rpx;
		padding: 0 36rpx;
		border-radius: $jr-radius-btn;
		background-color: $jr-primary;
		display: flex;
		align-items: center;
	}

	.follow--on {
		background-color: $jr-page-bg;
	}

	.follow-text {
		font-size: 28rpx;
		color: #FFFFFF;
	}

	.follow--on .follow-text {
		color: $jr-text-sub;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 14rpx 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.section {
		padding: 24rpx;
	}

	.section-title {
		display: block;
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		margin-bottom: 20rpx;
	}

	.item {
		margin-bottom: 24rpx;
	}

	.note {
		padding: 0 32rpx 40rpx;
	}

	.note-text {
		display: block;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.8;
	}
</style>
