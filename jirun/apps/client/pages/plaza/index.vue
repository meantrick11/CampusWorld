<template>
	<view class="page">
		<!-- 顶部品牌与搜索 -->
		<view class="header">
			<view class="brand">
				<text class="brand-name">暨快跑</text>
				<text class="brand-slogan">免费发布，直接联系</text>
			</view>
			<view class="search-entry" @click="goSearch">
				<text class="search-text">搜索标题或正文</text>
			</view>
		</view>

		<!-- 本地样例标识：绝不把样例数据当成云端结果 -->
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<!-- 板块切换 -->
		<view class="boards">
			<text class="board" :class="{ 'board--active': board === item.key }"
				v-for="item in boards" :key="item.key" @click="switchBoard(item.key)">{{ item.name }}</text>
		</view>

		<!-- 分类筛选（校园墙无分类） -->
		<view class="filters" v-if="categories.length">
			<text class="filter" :class="{ 'filter--active': !category }" @click="selectCategory('')">全部</text>
			<text class="filter" :class="{ 'filter--active': category === name }"
				v-for="name in categories" :key="name" @click="selectCategory(name)">{{ name }}</text>
		</view>

		<!-- 列表 -->
		<view class="list-area">
			<async-state :loading="loading && !items.length" :error="error" :retryable="retryable"
				:empty="!loading && !error && !items.length" :empty-title="emptyTitle"
				:empty-hint="emptyHint" @retry="loadFirstPage">
				<view v-if="isGridBoard" class="grid">
					<view class="grid-item" v-for="item in items" :key="item.id">
						<content-card :item="item" variant="idle" @open="openDetail"></content-card>
					</view>
				</view>
				<view v-else class="flow">
					<content-card class="flow-item" v-for="item in items" :key="item.id" :item="item"
						:variant="item.kind" @open="openDetail" @action="onWallAction"></content-card>
				</view>

				<view class="load-more" v-if="items.length">
					<text class="load-text" v-if="loading">加载中…</text>
					<text class="load-text" v-else-if="nextCursor" @click="loadMore">加载更多</text>
					<text class="load-text" v-else>没有更多了</text>
				</view>
			</async-state>
		</view>

		<!-- 独立发布入口 -->
		<view class="publish-fab" @click="goPublish">
			<text class="publish-plus">＋</text>
			<text class="publish-text">发布</text>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import ContentCard from '@/components/ContentCard.vue'
	import { BOARD_LIST, CATEGORY_MAP } from '@/utils/status.js'
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
				category: '',
				items: [],
				nextCursor: null,
				loading: false,
				error: '',
				retryable: false,
				localSample: false,
				// 每个板块各自的滚动位置，切换回来时不丢失
				scrollMemo: {
					all: 0,
					delivery: 0,
					idle: 0,
					wanted: 0,
					wall: 0
				}
			}
		},
		computed: {
			categories() {
				return this.board === 'all' ? [] : CATEGORY_MAP[this.board] || []
			},
			isGridBoard() {
				return this.board === 'idle'
			},
			emptyTitle() {
				return this.board === 'all' ? '广场还没有内容' : `暂无${this.boardName}信息`
			},
			emptyHint() {
				return this.category ? '换一个分类看看，或者清除筛选' : '成为第一个发布的人'
			},
			boardName() {
				const board = BOARD_LIST.find((item) => item.key === this.board)
				return board ? board.name : ''
			}
		},
		onShow() {
			if (!this.items.length && !this.loading) this.loadFirstPage()
		},
		onPageScroll(event) {
			this.scrollMemo[this.board] = event.scrollTop
		},
		onPullDownRefresh() {
			this.loadFirstPage().finally(() => uni.stopPullDownRefresh())
		},
		onReachBottom() {
			this.loadMore()
		},
		methods: {
			/** 查询条件变化必须重置游标，避免旧结果覆盖新筛选 */
			async loadFirstPage() {
				this.items = []
				this.nextCursor = null
				return this.fetch()
			},
			async loadMore() {
				if (!this.nextCursor || this.loading) return
				return this.fetch({ append: true })
			},
			async fetch({ append = false } = {}) {
				this.loading = true
				this.error = ''
				const cursor = append ? this.nextCursor : null
				try {
					const result = await listPublic({
						kind: this.board === 'all' ? undefined : this.board,
						category: this.category || undefined,
						cursor,
						limit: 20
					})
					this.localSample = Boolean(result.localSample)
					this.items = append ? this.items.concat(result.items) : result.items
					this.nextCursor = result.nextCursor
				} catch (error) {
					// 业务拒绝不重试；依赖与网络失败允许重试
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = this.retryable ? '网络或服务不可用，请重试' : error.message
				} finally {
					this.loading = false
				}
			},
			/** 切换板块：重置筛选与游标，并恢复该板块上次的滚动位置 */
			async switchBoard(key) {
				if (this.board === key) return
				this.scrollMemo[this.board] = this.currentScrollTop()
				this.board = key
				this.category = ''
				await this.loadFirstPage()
				uni.pageScrollTo({
					scrollTop: this.scrollMemo[key] || 0,
					duration: 0
				})
			},
			selectCategory(name) {
				if (this.category === name) return
				this.category = name
				this.loadFirstPage()
			},
			currentScrollTop() {
				// onPageScroll 只在滚动时更新，这里无需额外查询
				return this.scrollMemo[this.board] || 0
			},
			openDetail(item) {
				uni.navigateTo({
					url: `/pages/content/detail?id=${item.id}`
				})
			},
			goSearch() {
				uni.navigateTo({
					url: '/pages/search/index'
				})
			},
			goPublish() {
				uni.navigateTo({
					url: '/pages/publish/select'
				})
			},
			onWallAction(action) {
				// 六项互动由 T07 实现，这里明确告知而不是静默无响应
				uni.showToast({
					title: `互动功能（${action}）将在后续任务实现`,
					icon: 'none'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
		@include jr-safe-bottom(140rpx);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		background-color: $jr-card-bg;
	}

	.brand {
		display: flex;
		flex-direction: column;
	}

	.brand-name {
		font-size: 40rpx;
		font-weight: 600;
		color: $jr-text-main;
	}

	.brand-slogan {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-top: 4rpx;
	}

	.search-entry {
		min-width: 260rpx;
		height: 68rpx;
		border-radius: $jr-radius-btn;
		background-color: $jr-page-bg;
		display: flex;
		align-items: center;
		padding: 0 24rpx;
	}

	.search-text {
		font-size: 26rpx;
		color: $jr-text-placeholder;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 14rpx 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.boards {
		display: flex;
		align-items: center;
		background-color: $jr-card-bg;
		padding: 8rpx 16rpx 20rpx;
	}

	.board {
		font-size: 30rpx;
		color: $jr-text-sub;
		margin-right: 40rpx;
		height: 68rpx;
		line-height: 68rpx;
	}

	.board--active {
		color: $jr-primary;
		font-weight: 600;
		border-bottom: 4rpx solid $jr-primary;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		padding: 16rpx 24rpx 0;
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
		padding: 24rpx;
	}

	.flow-item {
		margin-bottom: 24rpx;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
	}

	.grid-item {
		width: 48.5%;
		margin-bottom: 24rpx;
	}

	.load-more {
		display: flex;
		justify-content: center;
		padding: 20rpx 0 40rpx;
	}

	.load-text {
		font-size: 26rpx;
		color: $jr-text-sub;
	}

	.publish-fab {
		position: fixed;
		right: 32rpx;
		bottom: 60rpx;
		height: 96rpx;
		padding: 0 36rpx;
		border-radius: 48rpx;
		background-color: $jr-primary;
		display: flex;
		align-items: center;
		box-shadow: 0 8rpx 24rpx rgba(20, 125, 100, 0.3);
		@include jr-safe-bottom(0rpx);
	}

	.publish-plus {
		color: #FFFFFF;
		font-size: 40rpx;
		margin-right: 8rpx;
	}

	.publish-text {
		color: #FFFFFF;
		font-size: 30rpx;
	}
</style>
