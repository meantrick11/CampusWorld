<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="toolbar">
			<text class="toolbar-title">待审内容</text>
			<text class="toolbar-hint">审核针对具体版本；旧版本的审核结果不会发布用户后来修改的版本</text>
		</view>

		<view v-if="!items.length" class="empty">
			<text class="empty-text">当前没有待审内容</text>
		</view>

		<view class="item" v-for="item in items" :key="item.targetId">
			<view class="item-head">
				<text class="kind">{{ kindName(item.kind) }}</text>
				<text class="author">{{ item.authorId }}</text>
			</view>
			<text class="title" v-if="item.title">{{ item.title }}</text>
			<text class="body">{{ item.body }}</text>
			<view class="fields" v-if="fieldsOf(item).length">
				<text class="field" v-for="field in fieldsOf(item)" :key="field">{{ field }}</text>
			</view>
			<text class="media-hint" v-if="item.mediaIds && item.mediaIds.length">
				含 {{ item.mediaIds.length }} 个媒体文件
				<text class="media-note">（媒体审核在媒体任务中实现，当前不可用）</text>
			</text>

			<view class="ops">
				<text class="op op--primary" @click="act(item, 'approve')">通过</text>
				<text class="op" @click="act(item, 'reject')">驳回</text>
				<text class="op op--danger" @click="act(item, 'remove')">下架</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { listQueue, decide } from '@/services/jirun-admin.js'

	export default {
		data() {
			return {
				items: [],
				localSample: false
			}
		},
		onLoad() {
			this.load()
		},
		methods: {
			async load() {
				try {
					const result = await listQueue({ queue: 'content', limit: 20 })
					this.items = result.data.items
					this.localSample = Boolean(result.localSample)
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			kindName(kind) {
				return {
					delivery: '取送',
					idle: '闲置',
					wanted: '求购',
					wall: '校园墙'
				} [kind] || kind
			},
			fieldsOf(item) {
				const details = item.details || {}
				const parts = []
				if (details.fromRegion && details.toRegion) parts.push(`${details.fromRegion} → ${details.toRegion}`)
				if (details.category) parts.push(details.category)
				if (details.priceType === 'amount') parts.push(`金额 ${details.amountFen} 分`)
				if (details.priceType === 'free') parts.push('免费赠送')
				if (details.priceType === 'negotiable') parts.push('价格面议')
				if (details.rewardType === 'amount') parts.push(`报酬 ${details.rewardFen} 分`)
				if (details.rewardType === 'free') parts.push('无偿帮忙')
				if (details.rewardType === 'negotiable') parts.push('报酬面议')
				if (details.remainingQuantity !== undefined) parts.push(`剩余 ${details.remainingQuantity}`)
				if (details.neededQuantity !== undefined) parts.push(`还需 ${details.neededQuantity}`)
				if (details.mediaForm) parts.push(`媒体形式 ${details.mediaForm}`)
				return parts
			},
			act(item, action) {
				const needReason = action !== 'approve'
				uni.showModal({
					title: needReason ? '填写处理原因' : '确认通过',
					editable: needReason,
					placeholderText: needReason ? '原因会展示给作者' : '',
					content: needReason ? '' : '通过后该版本将公开显示在广场。',
					success: async (res) => {
						if (!res.confirm) return
						try {
							await decide({
								targetType: 'content',
								targetId: item.targetId,
								expectedVersion: item.version,
								action,
								reason: res.content || ''
							})
							uni.showToast({
								title: '已处理',
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

	.toolbar {
		margin-bottom: 16px;
	}

	.toolbar-title {
		display: block;
		font-size: 16px;
		color: #172B26;
	}

	.toolbar-hint {
		display: block;
		font-size: 12px;
		color: #5F706A;
		margin-top: 4px;
	}

	.empty {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 40px;
		text-align: center;
	}

	.empty-text {
		font-size: 13px;
		color: #5F706A;
	}

	.item {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 16px;
	}

	.item-head {
		display: flex;
		justify-content: space-between;
	}

	.kind {
		font-size: 13px;
		color: #147D64;
	}

	.author {
		font-size: 12px;
		color: #5F706A;
	}

	.title {
		display: block;
		font-size: 15px;
		color: #172B26;
		margin-top: 10px;
	}

	.body {
		display: block;
		font-size: 13px;
		color: #172B26;
		line-height: 1.7;
		margin-top: 8px;
	}

	.fields {
		display: flex;
		flex-wrap: wrap;
		margin-top: 10px;
	}

	.field {
		font-size: 12px;
		color: #5F706A;
		background-color: #F6F8F7;
		border-radius: 4px;
		padding: 2px 8px;
		margin: 0 8px 8px 0;
	}

	.media-hint {
		display: block;
		font-size: 12px;
		color: #5F706A;
		margin-top: 6px;
	}

	.media-note {
		color: #D98324;
	}

	.ops {
		display: flex;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid #E3E8E6;
	}

	.op {
		font-size: 13px;
		color: #5F706A;
		margin-right: 24px;
	}

	.op--primary {
		color: #147D64;
	}

	.op--danger {
		color: #C0392B;
	}
</style>
