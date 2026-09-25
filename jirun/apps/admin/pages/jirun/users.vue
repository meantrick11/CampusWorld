<template>
	<view class="page">
		<view v-if="localSample" class="sample-banner">
			<text class="sample-text">本地样例数据 · 未连接云端，仅供查看界面</text>
		</view>

		<view class="toolbar">
			<text class="toolbar-title">账号限制</text>
			<text class="toolbar-hint">只提供人工限制发布与私聊，均需写明原因并留痕；不提供自动封号与处罚期限累计</text>
		</view>

		<view class="search">
			<input class="input" v-model="userId" placeholder="输入用户 ID 后查询限制状态" />
			<text class="search-btn" @click="load">查询</text>
		</view>

		<view v-if="loaded && !items.length" class="empty">
			<text class="empty-text">该用户当前没有被限制</text>
		</view>

		<view class="item" v-for="item in items" :key="`${item.userId}-${item.scope}`">
			<view class="item-head">
				<text class="kind">{{ item.scope === 'publish' ? '限制发布' : '限制私聊' }}</text>
				<text class="author">{{ item.userId }}</text>
			</view>
			<text class="body">原因：{{ item.reason }}</text>
			<text class="target">操作者：{{ item.actorId }}</text>
			<view class="ops">
				<text class="op op--primary" @click="release(item)">解除限制</text>
			</view>
		</view>

		<view class="form">
			<text class="form-title">新增限制</text>
			<view class="row">
				<text class="row-label">范围</text>
				<view class="options">
					<text class="option" :class="{ 'option--active': scope === item.value }" v-for="item in scopes"
						:key="item.value" @click="scope = item.value">{{ item.label }}</text>
				</view>
			</view>
			<view class="row">
				<text class="row-label">原因</text>
				<input class="input" v-model="reason" placeholder="必填，会记入审计日志" />
			</view>
			<view class="submit" @click="restrict">
				<text class="submit-text">提交限制</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { listRestrictions, restrictUser } from '@/services/jirun-admin.js'

	export default {
		data() {
			return {
				userId: '',
				scope: 'publish',
				reason: '',
				items: [],
				loaded: false,
				localSample: false,
				scopes: [{
						value: 'publish',
						label: '限制发布'
					},
					{
						value: 'chat',
						label: '限制私聊'
					}
				]
			}
		},
		methods: {
			async load() {
				if (!this.userId.trim()) {
					uni.showToast({
						title: '请输入用户 ID',
						icon: 'none'
					})
					return
				}
				try {
					const result = await listRestrictions({
						userId: this.userId.trim()
					})
					this.items = result.data.items
					this.localSample = Boolean(result.localSample)
					this.loaded = true
				} catch (error) {
					uni.showToast({
						title: error.message,
						icon: 'none'
					})
				}
			},
			async restrict() {
				if (!this.userId.trim() || !this.reason.trim()) {
					uni.showToast({
						title: '用户与原因都需要填写',
						icon: 'none'
					})
					return
				}
				await this.submit({
					userId: this.userId.trim(),
					scope: this.scope,
					enabled: true,
					reason: this.reason.trim()
				}, '已限制')
			},
			release(item) {
				uni.showModal({
					title: '解除限制',
					editable: true,
					placeholderText: '填写解除原因（必填）',
					success: async (res) => {
						if (!res.confirm) return
						if (!res.content || !res.content.trim()) {
							uni.showToast({
								title: '解除限制也需要写明原因',
								icon: 'none'
							})
							return
						}
						await this.submit({
							userId: item.userId,
							scope: item.scope,
							enabled: false,
							reason: res.content.trim()
						}, '已解除')
					}
				})
			},
			async submit(payload, toast) {
				try {
					await restrictUser(payload)
					uni.showToast({
						title: toast,
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

	.search {
		display: flex;
		align-items: center;
		margin-bottom: 16px;
	}

	.input {
		flex: 1;
		height: 36px;
		background-color: #FFFFFF;
		border-radius: 4px;
		padding: 0 12px;
		font-size: 13px;
		color: #172B26;
	}

	.search-btn {
		font-size: 13px;
		color: #147D64;
		margin-left: 12px;
	}

	.empty {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 40px;
		text-align: center;
		margin-bottom: 16px;
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
		color: #C0392B;
	}

	.author {
		font-size: 12px;
		color: #5F706A;
	}

	.body {
		display: block;
		font-size: 13px;
		color: #172B26;
		margin-top: 10px;
	}

	.target {
		display: block;
		font-size: 12px;
		color: #9AA8A3;
		margin-top: 6px;
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

	.form {
		background-color: #FFFFFF;
		border-radius: 8px;
		padding: 20px;
	}

	.form-title {
		display: block;
		font-size: 14px;
		color: #172B26;
		margin-bottom: 12px;
	}

	.row {
		display: flex;
		align-items: center;
		margin-bottom: 12px;
	}

	.row-label {
		font-size: 13px;
		color: #5F706A;
		width: 56px;
	}

	.options {
		display: flex;
	}

	.option {
		font-size: 12px;
		color: #5F706A;
		background-color: #F6F8F7;
		border-radius: 4px;
		padding: 6px 14px;
		margin-right: 10px;
	}

	.option--active {
		color: #FFFFFF;
		background-color: #147D64;
	}

	.submit {
		height: 40px;
		border-radius: 4px;
		background-color: #147D64;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 8px;
	}

	.submit-text {
		color: #FFFFFF;
		font-size: 14px;
	}
</style>
