<template>
	<view class="comments">
		<view class="head">
			<text class="head-title">评论</text>
			<text class="head-count" v-if="total">{{ total }}</text>
		</view>

		<async-state :loading="loading && !items.length" :error="error" :retryable="retryable"
			:empty="!loading && !error && !items.length" empty-title="还没有评论"
			empty-hint="说点什么，让更多人看到" @retry="load">
			<view class="item" v-for="comment in items" :key="comment.id">
				<view class="item-main">
					<view class="avatar">
						<text class="avatar-text">{{ avatarText(comment.author) }}</text>
					</view>
					<view class="item-body">
						<text class="name">{{ displayName(comment.author) }}</text>
						<text class="text">{{ comment.body }}</text>
						<view class="item-ops">
							<text class="op" @click="startReply(comment)">回复</text>
							<text class="op op--danger" v-if="comment.canDelete" @click="remove(comment)">删除</text>
							<text class="op-time">{{ formatTime(comment.createdAt) }}</text>
						</view>
					</view>
				</view>

				<!-- 一层回复 -->
				<view class="replies" v-if="comment.replies.length">
					<view class="reply" v-for="reply in comment.replies" :key="reply.id">
						<text class="name">{{ displayName(reply.author) }}</text>
						<text class="text">{{ reply.body }}</text>
						<view class="item-ops">
							<text class="op op--danger" v-if="reply.canDelete" @click="remove(reply)">删除</text>
							<text class="op-time">{{ formatTime(reply.createdAt) }}</text>
						</view>
					</view>
				</view>
			</view>
		</async-state>

		<!-- 输入区：明确显示正在回复谁，可取消 -->
		<view class="composer">
			<view class="reply-hint" v-if="replyingTo">
				<text class="hint-text">正在回复 {{ displayName(replyingTo.author) }}</text>
				<text class="hint-cancel" @click="cancelReply">取消</text>
			</view>
			<view class="composer-row">
				<input class="input" v-model="draft" :maxlength="limits.commentMax" :placeholder="placeholder"
					confirm-type="send" @confirm="submit" />
				<text class="send" :class="{ 'send--disabled': !draft.trim() }" @click="submit">发送</text>
			</view>
			<text class="composer-note">提交后需通过审核才会公开</text>
		</view>
	</view>
</template>

<script>
	import AsyncState from './AsyncState.vue'
	import limits from '@/config/limits.json'
	import { formatTime, displayName, avatarText } from '@/utils/format.js'
	import { listComments, submitComment, deleteOwnComment } from '@/services/social.js'

	export default {
		name: 'CommentList',
		components: {
			AsyncState
		},
		props: {
			contentId: {
				type: String,
				required: true
			}
		},
		emits: ['count-change'],
		data() {
			return {
				limits,
				items: [],
				loading: false,
				error: '',
				retryable: false,
				draft: '',
				replyingTo: null
			}
		},
		computed: {
			total() {
				return this.items.reduce((sum, item) => sum + 1 + item.replies.length, 0)
			},
			placeholder() {
				return this.replyingTo ? `回复 ${displayName(this.replyingTo.author)}` : '写下你的评论'
			}
		},
		watch: {
			total(value) {
				this.$emit('count-change', value)
			}
		},
		mounted() {
			this.load()
		},
		methods: {
			formatTime,
			displayName,
			avatarText,
			async load() {
				this.loading = true
				this.error = ''
				try {
					const result = await listComments({ contentId: this.contentId })
					this.items = result.data.items
				} catch (error) {
					this.retryable = error.code === 'DEPENDENCY_UNAVAILABLE'
					this.error = error.message
				} finally {
					this.loading = false
				}
			},
			startReply(comment) {
				this.replyingTo = comment
				this.draft = ''
			},
			cancelReply() {
				this.replyingTo = null
				this.draft = ''
			},
			async submit() {
				const body = this.draft.trim()
				if (!body) return
				try {
					await submitComment({
						contentId: this.contentId,
						parentId: this.replyingTo ? this.replyingTo.id : null,
						body
					})
					this.draft = ''
					this.replyingTo = null
					uni.showToast({
						title: '已提交，待审核后公开',
						icon: 'none'
					})
					this.load()
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			remove(comment) {
				uni.showModal({
					title: '删除评论',
					content: '删除后其他人将看不到这条评论。',
					confirmColor: '#C0392B',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await deleteOwnComment({ id: comment.id })
							uni.showToast({
								title: '已删除',
								icon: 'none'
							})
							this.load()
						} catch (error) {
							uni.showToast({
								title: error.message,
								icon: 'none'
							})
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.head {
		display: flex;
		align-items: center;
		padding: 8rpx 0 20rpx;
	}

	.head-title {
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
	}

	.head-count {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-left: 12rpx;
	}

	.item {
		padding: 20rpx 0;
		border-bottom: 1rpx solid $jr-border;
	}

	.item:last-child {
		border-bottom: none;
	}

	.item-main {
		display: flex;
	}

	.avatar {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background-color: $jr-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 16rpx;
		flex-shrink: 0;
	}

	.avatar-text {
		font-size: 24rpx;
		color: $jr-primary;
	}

	.item-body {
		flex: 1;
		min-width: 0;
	}

	.name {
		display: block;
		font-size: 26rpx;
		color: $jr-text-sub;
	}

	.text {
		display: block;
		font-size: 28rpx;
		color: $jr-text-main;
		line-height: 1.6;
		margin-top: 6rpx;
		word-break: break-all;
	}

	.item-ops {
		display: flex;
		align-items: center;
		margin-top: 8rpx;
	}

	.op {
		font-size: 24rpx;
		color: $jr-text-sub;
		margin-right: 28rpx;
	}

	.op--danger {
		color: $jr-danger;
	}

	.op-time {
		font-size: 22rpx;
		color: $jr-text-placeholder;
		margin-left: auto;
	}

	.replies {
		margin-left: 72rpx;
		margin-top: 16rpx;
		background-color: $jr-page-bg;
		border-radius: 8rpx;
		padding: 16rpx;
	}

	.reply {
		padding: 8rpx 0;
	}

	.composer {
		margin-top: 24rpx;
		padding-top: 20rpx;
		border-top: 1rpx solid $jr-border;
	}

	.reply-hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: $jr-primary-light;
		border-radius: 8rpx;
		padding: 10rpx 16rpx;
		margin-bottom: 12rpx;
	}

	.hint-text {
		font-size: 24rpx;
		color: $jr-primary;
	}

	.hint-cancel {
		font-size: 24rpx;
		color: $jr-text-sub;
	}

	.composer-row {
		display: flex;
		align-items: center;
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

	.send {
		font-size: 30rpx;
		color: $jr-primary;
		margin-left: 24rpx;
	}

	.send--disabled {
		color: $jr-text-placeholder;
	}

	.composer-note {
		display: block;
		font-size: 22rpx;
		color: $jr-text-placeholder;
		margin-top: 10rpx;
	}
</style>
