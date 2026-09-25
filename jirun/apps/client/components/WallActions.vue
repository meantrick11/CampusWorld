<template>
	<view class="actions">
		<text class="action" :class="{ 'action--on': summary.liked }" @click="toggle('like')">
			{{ summary.liked ? '已赞' : '点赞' }}<text class="count" v-if="summary.likes">{{ summary.likes }}</text>
		</text>
		<text class="action" @click="$emit('comment')">
			评论<text class="count" v-if="summary.comments">{{ summary.comments }}</text>
		</text>
		<text class="action" :class="{ 'action--on': summary.favorited }" @click="toggle('favorite')">
			{{ summary.favorited ? '已收藏' : '收藏' }}<text class="count" v-if="summary.favorites">{{ summary.favorites }}</text>
		</text>

		<!-- 小程序用原生转发；H5 没有原生转发，由页面复制链接 -->
		<!-- #ifdef MP-WEIXIN -->
		<button class="action action--share" open-type="share">分享</button>
		<!-- #endif -->
		<!-- #ifndef MP-WEIXIN -->
		<text class="action" @click="$emit('share')">分享</text>
		<!-- #endif -->
	</view>
</template>

<script>
	export default {
		name: 'WallActions',
		props: {
			contentId: {
				type: String,
				required: true
			},
			summary: {
				type: Object,
				default: () => ({
					likes: 0,
					comments: 0,
					favorites: 0,
					liked: false,
					favorited: false
				})
			},
			// 未登录时页面会拦截并引导登录
			enabled: {
				type: Boolean,
				default: true
			}
		},
		emits: ['toggle', 'comment', 'share'],
		methods: {
			toggle(type) {
				if (!this.enabled) return
				// 传入明确的 enabled 值，避免重复点击导致状态反转
				const enabled = type === 'like' ? !this.summary.liked : !this.summary.favorited
				this.$emit('toggle', { contentId: this.contentId, type, enabled })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.actions {
		display: flex;
		align-items: center;
	}

	.action {
		flex: 1;
		text-align: center;
		font-size: 26rpx;
		color: $jr-text-sub;
		height: 64rpx;
		line-height: 64rpx;
		background-color: transparent;
		border: none;
		padding: 0;
		margin: 0;
	}

	.action::after {
		border: none;
	}

	.action--on {
		color: $jr-primary;
	}

	.action--share {
		font-family: inherit;
	}

	.count {
		font-size: 22rpx;
		margin-left: 6rpx;
		color: $jr-text-placeholder;
	}
</style>
