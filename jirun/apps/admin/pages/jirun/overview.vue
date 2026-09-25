<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="cards">
			<view class="card" v-for="item in cards" :key="item.key">
				<text class="value">{{ metrics[item.key] }}</text>
				<text class="name">{{ item.name }}</text>
				<text class="hint">{{ item.hint }}</text>
			</view>
		</view>

		<view class="note">
			<text class="note-title">概览说明</text>
			<text class="note-text">只统计发布与审核积压情况。平台完全免费，因此这里没有交易额、订单量、结算或分成数据。</text>
			<text class="note-text">审核积压为 0 不代表没有待处理内容，请以各队列页面为准。</text>
		</view>
	</view>
</template>

<script>
	import { getMetrics } from '@/services/jirun-admin.js'

	export default {
		data() {
			return {
				metrics: {},
				localSample: false,
				cards: [{
						key: 'pendingContents',
						name: '待审内容',
						hint: '等待审核的发布'
					},
					{
						key: 'openReports',
						name: '待处理举报',
						hint: '尚未作出决定'
					},
					{
						key: 'openAppeals',
						name: '待处理复核',
						hint: '作者提交的复核申请'
					},
					{
						key: 'activeRestrictions',
						name: '生效中的账号限制',
						hint: '人工限制，可随时解除'
					},
					{
						key: 'publishedContents',
						name: '已公开内容',
						hint: '当前在广场可见'
					},
					{
						key: 'contents',
						name: '内容总数',
						hint: '含未公开与已下架'
					}
				]
			}
		},
		onLoad() {
			this.load()
		},
		methods: {
			async load() {
				try {
					const result = await getMetrics()
					this.metrics = result.data || {}
					this.localSample = Boolean(result.localSample)
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		padding: 20px;
		background-color: #F6F8F7;
		min-height: 100vh;
	}

	.sample-banner {
		background-color: rgba(217, 131, 36, 0.12);
		padding: 8px 12px;
		border-radius: 4px;
		margin-bottom: 16px;
	}

	.sample-text {
		font-size: 12px;
		color: #D98324;
	}

	.cards {
		display: flex;
		flex-wrap: wrap;
	}

	.card {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
		width: 30%;
		margin: 0 1.5% 16px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.value {
		font-size: 32px;
		font-weight: 600;
		color: #147D64;
	}

	.name {
		font-size: 14px;
		color: #172B26;
		margin-top: 8px;
	}

	.hint {
		font-size: 12px;
		color: #5F706A;
		margin-top: 4px;
	}

	.note {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
	}

	.note-title {
		display: block;
		font-size: 14px;
		color: #172B26;
		margin-bottom: 8px;
	}

	.note-text {
		display: block;
		font-size: 12px;
		color: #5F706A;
		line-height: 1.8;
	}
</style>
