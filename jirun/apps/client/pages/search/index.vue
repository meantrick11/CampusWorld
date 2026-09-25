<template>
	<view class="page">
		<view class="search-bar">
			<input class="input" v-model="keyword" placeholder="搜索标题或正文" confirm-type="search"
				@confirm="doSearch" />
			<text class="search-btn" @click="doSearch">搜索</text>
		</view>

		<view class="boards">
			<text class="board" :class="{ 'board--active': board === item.key }" v-for="item in boards"
				:key="item.key" @click="switchBoard(item.key)">{{ item.name }}</text>
		</view>

		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="list-area">
			<async-state :loading="loading" :error="error" :retryable="retryable"
				:empty="!loading && !error && searched" empty-title="没有找到相关内容"
				empty-hint="换个关键词，或把板块切到「全部」再试" @retry="doSearch">
				<content-card class="item" v-for="item in items" :key="item.id" :item="item"
					:variant="item.kind" @open="openDetail" @action="onWallAction"></content-card>
			</async-state>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import ContentCard from '@/components/ContentCard.vue'
	import { BOARD_LIST } from '@/utils/status.js'
	import { listPublic } from '@/services/content.js'

	export default {
		components: {
			AsyncState,
			ContentCard
		},
		data() {
			return {
				boards: BOARD_LIST,
				board: 'all',
				keyword: '',
				items: [],
				loading: false,
				error: '',
				retryable: false,
				localSample: false,
				searched: false
			}
		},
		methods: {
			switchBoard(key) {
				if (this.board === key) return
				this.board = key
				if (this.searched) this.doSearch()
			},
			async doSearch() {
				this.loading = true
				this.error = ''
				this.searched = true
				try {
					const result = await listPublic({
						kind: this.board === 'all' ? undefined : this.board,
						keyword: this.keyword || undefined,
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
			openDetail(item) {
				uni.navigateTo({ url: `/pages/content/detail?id=${item.id}` })
			},
			onWallAction(action) {
				uni.showToast({ title: `互动功能（${action}）将在后续任务实现`, icon: 'none' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
	}

	.search-bar {
		display: flex;
		align-items: center;
		padding: 20rpx 24rpx;
		background-color: $jr-card-bg;
	}

	.input {
		flex: 1;
		height: 76rpx;
		background-color: $jr-page-bg;
		border-radius: $jr-radius-btn;
		padding: 0 24rpx;
		font-size: 28rpx;
		color: $jr-text-main;
	}

	.search-btn {
		font-size: 30rpx;
		color: $jr-primary;
		margin-left: 24rpx;
	}

	.boards {
		display: flex;
		align-items: center;
		background-color: $jr-card-bg;
		padding: 0 16rpx 16rpx;
	}

	.board {
		font-size: 28rpx;
		color: $jr-text-sub;
		margin-right: 32rpx;
		height: 64rpx;
		line-height: 64rpx;
	}

	.board--active {
		color: $jr-primary;
		font-weight: 600;
		border-bottom: 4rpx solid $jr-primary;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 14rpx 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.list-area {
		padding: 24rpx;
	}

	.item {
		margin-bottom: 24rpx;
	}
</style>
