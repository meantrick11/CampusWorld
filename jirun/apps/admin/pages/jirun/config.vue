<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="toolbar">
			<text class="toolbar-title">平台配置</text>
			<text class="toolbar-hint">修改使用版本检查；平台完全免费，配置中不存在任何收费开关</text>
		</view>

		<view class="item" v-for="item in items" :key="item.key">
			<view class="item-head">
				<text class="key">{{ item.key }}</text>
				<text class="version">版本 {{ item.version }}</text>
			</view>
			<text class="value">{{ preview(item.value) }}</text>
			<view class="ops">
				<text class="op" @click="edit(item)">修改</text>
			</view>
		</view>

		<view v-if="!items.length" class="empty">
			<text class="empty-text">还没有配置项</text>
		</view>

		<view class="note">
			<text class="note-text">分类、区域、容量与文本上限属于开发默认值，上线前需由负责人复核。举报原因文案由本页配置后统一下发。</text>
		</view>
	</view>
</template>

<script>
	import { listConfig, updateConfig } from '@/services/jirun-admin.js'

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
					const result = await listConfig()
					this.items = result.data.items
					this.localSample = Boolean(result.localSample)
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			preview(value) {
				if (value === null || value === undefined) return '（空）'
				const text = typeof value === 'string' ? value : JSON.stringify(value)
				return text.length > 120 ? `${text.slice(0, 120)}…` : text
			},
			edit(item) {
				uni.showModal({
					title: `修改 ${item.key}`,
					editable: true,
					placeholderText: '输入 JSON，例如 ["a","b"]',
					content: JSON.stringify(item.value),
					success: async (res) => {
						if (!res.confirm) return
						let parsed
						try {
							parsed = JSON.parse(res.content)
						} catch (error) {
							uni.showToast({
								title: '内容必须是合法 JSON',
								icon: 'none'
							})
							return
						}
						try {
							await updateConfig({
								key: item.key,
								value: parsed,
								expectedVersion: item.version
							})
							uni.showToast({
								title: '已保存',
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

	.key {
		font-size: 14px;
		color: #172B26;
	}

	.version {
		font-size: 12px;
		color: #5F706A;
	}

	.value {
		display: block;
		font-size: 12px;
		color: #5F706A;
		line-height: 1.7;
		margin-top: 10px;
		word-break: break-all;
	}

	.ops {
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid #E3E8E6;
	}

	.op {
		font-size: 13px;
		color: #147D64;
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

	.note {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
	}

	.note-text {
		font-size: 12px;
		color: #5F706A;
		line-height: 1.8;
	}
</style>
