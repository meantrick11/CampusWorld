<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<async-state :loading="loading" :error="error" :retryable="retryable" @retry="load">
			<view v-if="item" class="content">
				<!-- 取送：先路线与时间 -->
				<view v-if="kind === 'delivery'" class="card">
					<view class="route">
						<text class="route-from">{{ details.fromRegion }}</text>
						<text class="route-arrow">→</text>
						<text class="route-to">{{ details.toRegion }}</text>
					</view>
					<view class="row">
						<text class="label">物品</text>
						<text class="value">{{ details.category }} · {{ details.size }}</text>
					</view>
					<view class="row">
						<text class="label">件数</text>
						<text class="value">{{ details.pieces }} 件</text>
					</view>
					<view class="row">
						<text class="label">时间</text>
						<text class="value">{{ details.timeNote || '未说明' }}</text>
					</view>
					<view class="row">
						<text class="label">报酬意向</text>
						<text class="value">{{ rewardText }}</text>
					</view>
					<text class="detail-note">详情只展示公开区域，不展示具体取件信息。平台不参与交易，报酬与交付方式由双方自行协商。</text>
				</view>

				<!-- 闲置与求购：先图片与价格／预算 -->
				<view v-else-if="kind === 'idle' || kind === 'wanted'" class="card">
					<view class="media-grid" v-if="mediaCount">
						<view class="media-cell" v-for="media in item.media" :key="media.id">
							<text class="media-hint">图片</text>
						</view>
					</view>
					<view class="row">
						<text class="label">{{ kind === 'idle' ? '价格' : '预算' }}</text>
						<text class="value value--price">{{ priceText }}</text>
					</view>
					<view class="row">
						<text class="label">{{ kind === 'idle' ? '剩余数量' : '还需要' }}</text>
						<text class="value">{{ quantityText }}</text>
					</view>
					<view class="row" v-if="details.handoverRegion">
						<text class="label">交接区域</text>
						<text class="value">{{ details.handoverRegion }}</text>
					</view>
				</view>

				<!-- 标题与正文 -->
				<view class="card">
					<view class="title-row">
						<text class="title" v-if="item.title">{{ item.title }}</text>
						<status-badge v-if="item.businessStatus" :status="item.businessStatus"></status-badge>
					</view>
					<text class="body">{{ item.body }}</text>
					<!-- 校园墙视频：正式播放依赖媒体服务签发访问凭据（T05） -->
					<view v-if="isVideo" class="video-cover">
						<text class="media-hint">视频封面（播放能力待 T05 媒体服务）</text>
						<view class="play"></view>
					</view>
					<view class="author">
						<author-bar :author="item.author" :created-at="item.createdAt"></author-bar>
					</view>
					<!-- 校园墙的六项互动：点赞、评论、收藏、分享在此，关注在作者区 -->
					<view class="wall-actions" v-if="kind === 'wall'">
						<wall-actions :content-id="item.id" :summary="summaryOf(item.id)"
							@toggle="toggleReaction" @comment="onCommentTap" @share="shareContent(item)">
						</wall-actions>
					</view>
				</view>

				<!-- 评论与回复（校园墙） -->
				<view class="card" v-if="kind === 'wall'">
					<comment-list :content-id="item.id"></comment-list>
				</view>

				<view class="card tips">
					<text class="tip">信息由发布者自行维护，平台不介入交易与交付。</text>
					<text class="tip">遇到问题可以举报，处理期间该信息保持原有可见性。</text>
				</view>
			</view>
		</async-state>

		<!-- 底部主操作：取送为「联系发布者」；作者本人看到「管理信息」 -->
		<view class="bottom-bar" v-if="item">
			<view v-if="isOwner" class="action action--primary" @click="goManage">
				<text class="action-text">管理信息</text>
			</view>
			<view v-else class="action action--primary" @click="contact">
				<text class="action-text">联系发布者</text>
			</view>
		</view>
	</view>
</template>

<script>
	import AsyncState from '@/components/AsyncState.vue'
	import AuthorBar from '@/components/AuthorBar.vue'
	import StatusBadge from '@/components/StatusBadge.vue'
	import WallActions from '@/components/WallActions.vue'
	import CommentList from '@/components/CommentList.vue'
	import wallInteractions from '@/mixins/wall-interactions.js'
	import { getPublic } from '@/services/content.js'
	import { formatAmount, formatPriceType } from '@/utils/format.js'

	export default {
		components: {
			AsyncState,
			AuthorBar,
			StatusBadge,
			WallActions,
			CommentList
		},
		mixins: [wallInteractions],
		data() {
			return {
				id: '',
				item: null,
				loading: false,
				error: '',
				retryable: false,
				localSample: false
			}
		},
		computed: {
			kind() {
				return this.item ? this.item.kind : ''
			},
			details() {
				return (this.item && this.item.details) || {}
			},
			mediaCount() {
				return this.item ? (this.item.media || []).length : 0
			},
			isVideo() {
				return this.kind === 'wall' && this.details.mediaForm === 'video'
			},
			rewardText() {
				if (this.details.rewardType === 'amount') return `¥ ${formatAmount(this.details.rewardFen)}`
				return this.details.rewardType === 'free' ? '无偿帮忙' : '面议'
			},
			priceText() {
				if (this.kind === 'wanted') {
					return this.details.budgetType === 'amount' ?
						`¥ ${formatAmount(this.details.budgetFen)}` :
						'面议'
				}
				if (this.details.priceType === 'amount') return `¥ ${formatAmount(this.details.amountFen)}`
				return formatPriceType(this.details.priceType)
			},
			quantityText() {
				if (this.kind === 'wanted') return `${this.details.neededQuantity} 件`
				return `${this.details.remainingQuantity} 件`
			},
			isOwner() {
				// 作者判定最终以服务端 token 为准；这里只用于展示管理入口
				const session = uni.getStorageSync('uni_id_token')
				return Boolean(session) && this.item && this.item.author && this.item.author.isMe === true
			}
		},
		onLoad(query) {
			this.id = query.id || ''
			this.load()
		},
		methods: {
			async load() {
				if (!this.id) {
					this.error = '缺少内容标识'
					return
				}
				this.loading = true
				this.error = ''
				try {
					const result = await getPublic({ id: this.id })
					this.item = result.data
					this.localSample = Boolean(result.localSample)
					uni.setNavigationBarTitle({ title: this.navTitle() })
					this.loadSummaries([this.item])
				} catch (error) {
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = error.message
				} finally {
					this.loading = false
				}
			},
			navTitle() {
				return {
					delivery: '取送详情',
					idle: '闲置详情',
					wanted: '求购详情',
					wall: '校园墙'
				} [this.kind] || '详情'
			},
			goManage() {
				uni.navigateTo({ url: '/pages/mine/publications' })
			},
			onCommentTap() {
				// 评论列表就在本页下方，直接滚过去而不是跳转
				uni.pageScrollTo({
					selector: '.comments',
					duration: 200
				})
			},
			contact() {
				// 私聊在 T08 实现；此处明确说明，不假装已可用
				uni.showToast({ title: '私聊功能将在后续任务实现', icon: 'none' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
		padding-bottom: 180rpx;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 14rpx 24rpx;
	}

	.sample-text {
		font-size: $jr-font-small;
		color: $jr-warning;
	}

	.content {
		padding: 24rpx;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 26rpx;
		margin-bottom: 24rpx;
	}

	.route {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.route-from,
	.route-to {
		font-size: 34rpx;
		font-weight: 600;
		color: $jr-text-main;
		max-width: 44%;
		@include jr-ellipsis;
	}

	.route-arrow {
		color: $jr-primary;
		margin: 0 14rpx;
	}

	.row {
		display: flex;
		align-items: flex-start;
		margin-top: 12rpx;
	}

	.label {
		font-size: 26rpx;
		color: $jr-text-placeholder;
		width: 140rpx;
		flex-shrink: 0;
	}

	.value {
		font-size: 28rpx;
		color: $jr-text-main;
		flex: 1;
	}

	.value--price {
		color: $jr-danger;
		font-weight: 600;
	}

	.detail-note {
		display: block;
		margin-top: 20rpx;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.6;
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 12rpx;
	}

	.title {
		font-size: 38rpx;
		font-weight: 600;
		color: $jr-text-main;
		flex: 1;
		margin-right: 16rpx;
	}

	.body {
		display: block;
		font-size: 30rpx;
		color: $jr-text-main;
		line-height: 1.7;
	}

	.author {
		margin-top: 24rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid $jr-border;
	}

	.wall-actions {
		margin-top: 8rpx;
		padding-top: 12rpx;
		border-top: 1rpx solid $jr-border;
	}

	.media-grid {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 16rpx;
	}

	.media-cell {
		width: 200rpx;
		height: 200rpx;
		border-radius: 8rpx;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 10rpx 10rpx 0;
	}

	.video-cover {
		position: relative;
		margin-top: 20rpx;
		height: 360rpx;
		border-radius: 8rpx;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.play {
		position: absolute;
		width: 0;
		height: 0;
		border-top: 24rpx solid transparent;
		border-bottom: 24rpx solid transparent;
		border-left: 38rpx solid $jr-primary;
	}

	.media-hint {
		font-size: $jr-font-small;
		color: $jr-text-placeholder;
	}

	.tips {
		background-color: transparent;
		padding: 0 8rpx;
	}

	.tip {
		display: block;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.8;
	}

	.bottom-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: $jr-card-bg;
		padding: 16rpx 24rpx;
		border-top: 1rpx solid $jr-border;
		@include jr-safe-bottom(16rpx);
	}

	.action {
		height: 96rpx;
		border-radius: $jr-radius-btn;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action--primary {
		background-color: $jr-primary;
	}

	.action-text {
		color: #FFFFFF;
		font-size: 32rpx;
	}
</style>
