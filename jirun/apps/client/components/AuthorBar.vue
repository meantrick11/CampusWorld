<template>
	<view class="author-bar">
		<view class="avatar">
			<!-- 真实头像需要媒体服务签发访问凭据（T05）；在此之前用首字占位 -->
			<text class="avatar-text">{{ avatarText(author) }}</text>
		</view>
		<view class="meta">
			<text class="nickname">{{ displayName(author) }}</text>
			<text class="time" v-if="timeText">{{ timeText }}</text>
		</view>
		<slot name="trailing"></slot>
	</view>
</template>

<script>
	import {
		formatTime,
		displayName,
		avatarText
	} from '@/utils/format.js'

	export default {
		name: 'AuthorBar',
		props: {
			author: {
				type: Object,
				default: () => ({})
			},
			createdAt: {
				type: Number,
				default: 0
			}
		},
		computed: {
			timeText() {
				return this.createdAt ? formatTime(this.createdAt) : ''
			}
		},
		methods: {
			displayName,
			avatarText
		}
	}
</script>

<style lang="scss" scoped>
	.author-bar {
		display: flex;
		align-items: center;
	}

	.avatar {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 16rpx;
		flex-shrink: 0;
	}

	.avatar-text {
		font-size: 28rpx;
		color: $jr-primary;
		font-weight: 600;
	}

	.meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.nickname {
		font-size: 28rpx;
		color: $jr-text-main;
		@include jr-ellipsis;
	}

	.time {
		font-size: $jr-font-small;
		color: $jr-text-placeholder;
	}
</style>
