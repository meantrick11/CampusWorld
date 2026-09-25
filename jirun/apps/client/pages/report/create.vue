<template>
	<view class="page">
		<view class="card">
			<text class="label">举报对象</text>
			<text class="target">{{ targetLabel }}</text>
			<text class="target-sub" v-if="summary">{{ summary }}</text>
		</view>

		<view class="card">
			<text class="label">举报原因<text class="required">*</text></text>
			<view class="reasons">
				<text class="reason" :class="{ 'reason--active': reason === item.value }" v-for="item in reportReasons"
					:key="item.value" @click="reason = item.value">{{ item.label }}</text>
			</view>

			<text class="label">补充说明</text>
			<textarea class="textarea" v-model="description" :maxlength="500" placeholder="可选，简要说明情况" />
			<text class="counter">{{ description.length }}/500</text>
		</view>

		<view class="card notice">
			<text class="notice-title">举报后会发生什么</text>
			<text class="notice-text">提交后由审核人员查看。处理期间该内容保持原有可见性，不会被自动隐藏。</text>
			<text class="notice-text">平台完全免费，举报不收费，也不提供加急或付费处理。</text>
			<text class="notice-text">如果举报的是自己的内容，可以在「我的发布」里直接修改或删除。</text>
		</view>

		<view class="submit-bar">
			<view class="submit" :class="{ 'submit--disabled': submitting }" @click="submit">
				<text class="submit-text">提交举报</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { REPORT_REASONS, submitReport } from '@/services/moderation.js'

	export default {
		data() {
			return {
				reportReasons: REPORT_REASONS,
				targetType: 'content',
				targetId: '',
				targetLabel: '这条信息',
				summary: '',
				reason: '',
				description: '',
				submitting: false
			}
		},
		onLoad(query) {
			this.targetType = query.targetType || 'content'
			this.targetId = query.targetId || ''
			this.targetLabel = query.targetType === 'comment' ? '这条评论' : '这条信息'
			this.summary = query.summary ? decodeURIComponent(query.summary).slice(0, 80) : ''
		},
		methods: {
			async submit() {
				if (this.submitting) return
				if (!this.reason) {
					uni.showToast({
						title: '请选择举报原因',
						icon: 'none'
					})
					return
				}
				this.submitting = true
				try {
					const result = await submitReport({
						targetType: this.targetType,
						targetId: this.targetId,
						reason: this.reason,
						description: this.description
					})
					uni.showModal({
						title: '已提交',
						content: '举报已登记。处理期间该内容保持原有可见性；处理结果可在「举报历史」查看。',
						showCancel: false,
						success: () => uni.redirectTo({
							url: '/pages/report/history'
						})
					})
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				} finally {
					this.submitting = false
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		background-color: $jr-page-bg;
		padding: 24rpx 24rpx 220rpx;
	}

	.card {
		background-color: $jr-card-bg;
		border-radius: $jr-radius-card;
		padding: 26rpx;
		margin-bottom: 24rpx;
	}

	.label {
		display: block;
		font-size: 28rpx;
		color: $jr-text-main;
		margin-bottom: 12rpx;
	}

	.required {
		color: $jr-danger;
		margin-left: 4rpx;
	}

	.target {
		display: block;
		font-size: 30rpx;
		color: $jr-text-main;
	}

	.target-sub {
		display: block;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-top: 8rpx;
	}

	.reasons {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 24rpx;
	}

	.reason {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		background-color: $jr-page-bg;
		border-radius: $jr-radius-btn;
		padding: 10rpx 26rpx;
		margin: 0 16rpx 16rpx 0;
	}

	.reason--active {
		color: #FFFFFF;
		background-color: $jr-primary;
	}

	.textarea {
		width: 100%;
		height: 200rpx;
		background-color: $jr-page-bg;
		border-radius: 8rpx;
		padding: 16rpx 20rpx;
		font-size: 28rpx;
		color: $jr-text-main;
		box-sizing: border-box;
	}

	.counter {
		display: block;
		text-align: right;
		font-size: 22rpx;
		color: $jr-text-placeholder;
		margin-top: 6rpx;
	}

	.notice {
		background-color: transparent;
		padding: 0 8rpx;
	}

	.notice-title {
		display: block;
		font-size: 28rpx;
		color: $jr-text-main;
		margin-bottom: 10rpx;
	}

	.notice-text {
		display: block;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.8;
	}

	.submit-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: $jr-card-bg;
		border-top: 1rpx solid $jr-border;
		padding: 16rpx 24rpx;
		@include jr-safe-bottom(16rpx);
	}

	.submit {
		height: 96rpx;
		border-radius: $jr-radius-btn;
		background-color: $jr-primary;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.submit--disabled {
		opacity: 0.6;
	}

	.submit-text {
		color: #FFFFFF;
		font-size: 32rpx;
	}
</style>
