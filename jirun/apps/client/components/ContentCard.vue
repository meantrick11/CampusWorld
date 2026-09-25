<template>
	<view class="card" :class="`card--${variant}`" @click="$emit('open', item)">
		<!-- 闲置：双列图片卡片，先看图和价格 -->
		<template v-if="variant === 'idle'">
			<view class="cover">
				<view v-if="mediaCount" class="media-cell cover-cell">
					<text class="media-hint">图片</text>
					<text v-if="mediaCount > 1" class="media-count">{{ mediaCount }} 张</text>
				</view>
				<view v-else class="media-cell cover-cell media-cell--empty">
					<text class="media-hint">暂无图片</text>
				</view>
			</view>
			<view class="body">
				<text class="title">{{ item.title }}</text>
				<view class="row">
					<text class="price">{{ priceText }}</text>
					<text class="region" v-if="regionText">{{ regionText }}</text>
				</view>
			</view>
		</template>

		<!-- 取送：单列，先看路线和时间，再看物品与报酬 -->
		<template v-else-if="variant === 'delivery'">
			<view class="route">
				<text class="route-from">{{ details.fromRegion }}</text>
				<text class="route-arrow">→</text>
				<text class="route-to">{{ details.toRegion }}</text>
			</view>
			<view class="line">
				<text class="line-text">{{ details.category }} · {{ details.size }} · {{ details.pieces }} 件</text>
			</view>
			<view class="line" v-if="details.timeNote">
				<text class="line-label">时间</text>
				<text class="line-text">{{ details.timeNote }}</text>
			</view>
			<view class="line">
				<text class="line-label">报酬</text>
				<text class="line-text">{{ rewardText }}</text>
			</view>
			<text class="title title--sub" v-if="item.body">{{ item.body }}</text>
			<view class="footer">
				<author-bar :author="item.author" :created-at="item.createdAt"></author-bar>
				<status-badge :status="item.businessStatus"></status-badge>
			</view>
		</template>

		<!-- 求购：单列文字卡片，突出需求数量与预算 -->
		<template v-else-if="variant === 'wanted'">
			<view class="header">
				<text class="title">{{ item.title }}</text>
				<status-badge :status="item.businessStatus"></status-badge>
			</view>
			<text class="excerpt">{{ item.body }}</text>
			<view class="line">
				<text class="line-label">还需要</text>
				<text class="line-text">{{ details.neededQuantity }} 件</text>
			</view>
			<view class="line">
				<text class="line-label">预算</text>
				<text class="line-text">{{ budgetText }}</text>
			</view>
			<view class="footer">
				<author-bar :author="item.author" :created-at="item.createdAt"></author-bar>
			</view>
		</template>

		<!-- 校园墙：单列内容流，正文 + 图片网格或视频封面 + 互动栏 -->
		<template v-else>
			<author-bar :author="item.author" :created-at="item.createdAt"></author-bar>
			<text class="wall-body">{{ item.body }}</text>
			<view class="media-grid" v-if="mediaCount">
				<view class="media-cell" :class="mediaCellClass" v-for="media in visibleMedia" :key="media.id">
					<text class="media-hint">{{ isVideo ? '视频封面' : '图片' }}</text>
					<view v-if="isVideo" class="play"></view>
				</view>
			</view>
			<view class="actions" v-if="variant === 'wall'">
				<wall-actions :content-id="item.id" :summary="summary" @toggle="$emit('toggle', $event)"
					@comment="$emit('comment', item)" @share="$emit('share', item)"></wall-actions>
			</view>
		</template>
	</view>
</template>

<script>
	import AuthorBar from './AuthorBar.vue'
	import StatusBadge from './StatusBadge.vue'
	import WallActions from './WallActions.vue'
	import {
		formatAmount,
		formatPriceType
	} from '@/utils/format.js'

	export default {
		name: 'ContentCard',
		components: {
			AuthorBar,
			StatusBadge,
			WallActions
		},
		props: {
			item: {
				type: Object,
				required: true
			},
			// 与 item.kind 对应，但允许父级强制指定
			variant: {
				type: String,
				default: ''
			},
			// 校园墙的互动计数与本人状态，由页面批量取回后传入
			summary: {
				type: Object,
				default: () => ({
					likes: 0,
					comments: 0,
					favorites: 0,
					liked: false,
					favorited: false
				})
			}
		},
		emits: ['open', 'toggle', 'comment', 'share'],
		computed: {
			details() {
				return this.item.details || {}
			},
			mediaCount() {
				return (this.item.media || []).length
			},
			visibleMedia() {
				return (this.item.media || []).slice(0, 3)
			},
			isVideo() {
				return this.variant === 'wall' && this.details.mediaForm === 'video'
			},
			mediaCellClass() {
				if (this.isVideo) return 'media-cell--video'
				return this.visibleMedia.length === 1 ? 'media-cell--single' : 'media-cell--grid'
			},
			priceText() {
				if (this.details.priceType === 'amount') return `¥ ${formatAmount(this.details.amountFen)}`
				return formatPriceType(this.details.priceType)
			},
			rewardText() {
				if (this.details.rewardType === 'amount') return `¥ ${formatAmount(this.details.rewardFen)}`
				if (this.details.rewardType === 'free') return '无偿帮忙'
				return '面议'
			},
			budgetText() {
				if (this.details.budgetType === 'amount') return `¥ ${formatAmount(this.details.budgetFen)}`
				return '面议'
			},
			regionText() {
				return this.details.handoverRegion || ''
			}
		}
	}
</script>

<style lang="scss" scoped>
	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		overflow: hidden;
	}

	.title {
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		@include jr-ellipsis-lines(2);
	}

	.title--sub {
		font-size: 28rpx;
		font-weight: 400;
		margin-top: 12rpx;
		@include jr-ellipsis-lines(2);
	}

	.excerpt {
		font-size: 28rpx;
		color: $jr-text-sub;
		margin: 12rpx 0;
		@include jr-ellipsis-lines(2);
	}

	.route {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.route-from,
	.route-to {
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
		max-width: 44%;
		@include jr-ellipsis;
	}

	.route-arrow {
		color: $jr-primary;
		font-size: $jr-font-title;
		margin: 0 14rpx;
	}

	.line {
		display: flex;
		margin-top: 8rpx;
	}

	.line-label {
		font-size: 26rpx;
		color: $jr-text-placeholder;
		width: 84rpx;
		flex-shrink: 0;
	}

	.line-text {
		font-size: 26rpx;
		color: $jr-text-sub;
		flex: 1;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 20rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid $jr-border;
	}

	/* 取送 / 求购：单列卡片内边距 */
	.card--delivery,
	.card--wanted {
		padding: 26rpx;
	}

	/* 闲置：双列，封面在上 */
	.card--idle {
		display: flex;
		flex-direction: column;
	}

	.cover {
		width: 100%;
	}

	.body {
		padding: 18rpx 20rpx 22rpx;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.price {
		font-size: 30rpx;
		font-weight: 600;
		color: $jr-danger;
	}

	.region {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		max-width: 50%;
		@include jr-ellipsis;
	}

	/* 媒体占位：真实图片需要媒体服务签发访问凭据（T05），此前统一占位 */
	.media-cell {
		position: relative;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cover-cell {
		width: 100%;
		height: 300rpx;
	}

	.media-cell--empty {
		background-color: $jr-page-bg;
	}

	.media-hint {
		font-size: $jr-font-small;
		color: $jr-text-placeholder;
	}

	.media-count {
		position: absolute;
		right: 12rpx;
		bottom: 12rpx;
		font-size: 22rpx;
		color: #FFFFFF;
		background-color: rgba(0, 0, 0, 0.35);
		border-radius: 8rpx;
		padding: 2rpx 10rpx;
	}

	.media-grid {
		display: flex;
		flex-wrap: wrap;
		margin-top: 18rpx;
	}

	.media-grid .media-cell {
		border-radius: 8rpx;
		margin: 0 10rpx 10rpx 0;
	}

	.media-cell--single {
		width: 320rpx;
		height: 320rpx;
	}

	.media-cell--grid {
		width: 200rpx;
		height: 200rpx;
	}

	.media-cell--video {
		width: 100%;
		height: 360rpx;
		margin-right: 0;
	}

	.play {
		position: absolute;
		width: 0;
		height: 0;
		border-top: 22rpx solid transparent;
		border-bottom: 22rpx solid transparent;
		border-left: 34rpx solid $jr-primary;
		margin-left: 6rpx;
	}

	/* 校园墙 */
	.card--wall {
		padding: 26rpx;
	}

	.wall-body {
		display: block;
		font-size: 30rpx;
		color: $jr-text-main;
		line-height: 1.6;
		margin-top: 18rpx;
		@include jr-ellipsis-lines(4);
	}

	.actions {
		display: flex;
		align-items: center;
		margin-top: 20rpx;
		padding-top: 18rpx;
		border-top: 1rpx solid $jr-border;
	}

	.action {
		flex: 1;
		text-align: center;
		font-size: 26rpx;
		color: $jr-text-sub;
		height: 64rpx;
		line-height: 64rpx;
	}
</style>
