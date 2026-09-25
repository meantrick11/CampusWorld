<template>
	<view class="page">
		<view class="banner">
			<text class="banner-title">{{ title }}</text>
			<text class="banner-desc">提交后进入待处理，审核通过才会公开。</text>
		</view>

		<view class="card">
			<!-- 标题（校园墙不需要标题） -->
			<view class="field" v-if="kind !== 'wall'">
				<text class="label">标题<text class="required">*</text></text>
				<input class="input" v-model="form.title" :maxlength="limits.titleMax" placeholder="一句话说明" />
				<text class="counter">{{ form.title.length }}/{{ limits.titleMax }}</text>
				<text class="error" v-if="errors.title">{{ errors.title }}</text>
			</view>

			<!-- 取送字段 -->
			<template v-if="kind === 'delivery'">
				<view class="field">
					<text class="label">物品类别<text class="required">*</text></text>
					<input class="input" v-model="form.details.category" placeholder="如：快递代取" />
					<text class="error" v-if="errors['details.category']">{{ errors['details.category'] }}</text>
				</view>
				<view class="field">
					<text class="label">大小<text class="required">*</text></text>
					<input class="input" v-model="form.details.size" placeholder="如：小件" />
					<text class="error" v-if="errors['details.size']">{{ errors['details.size'] }}</text>
				</view>
				<view class="field">
					<text class="label">件数<text class="required">*</text></text>
					<input class="input" type="number" v-model="form.details.pieces" placeholder="1" />
					<text class="error" v-if="errors['details.pieces']">{{ errors['details.pieces'] }}</text>
				</view>
				<view class="field">
					<text class="label">起点区域<text class="required">*</text></text>
					<input class="input" v-model="form.details.fromRegion" placeholder="如：菜鸟驿站" />
					<text class="error" v-if="errors['details.fromRegion']">{{ errors['details.fromRegion'] }}</text>
				</view>
				<view class="field">
					<text class="label">终点区域<text class="required">*</text></text>
					<input class="input" v-model="form.details.toRegion" placeholder="如：三号宿舍楼" />
					<text class="error" v-if="errors['details.toRegion']">{{ errors['details.toRegion'] }}</text>
				</view>
				<view class="field">
					<text class="label">时间要求</text>
					<input class="input" v-model="form.details.timeNote" placeholder="如：今天 18:00 前" />
				</view>
				<view class="field">
					<text class="label">报酬意向<text class="required">*</text></text>
					<view class="options">
						<text class="option" :class="{ 'option--active': form.details.rewardType === item.value }"
							v-for="item in priceOptions" :key="item.value"
							@click="form.details.rewardType = item.value">{{ item.label }}</text>
					</view>
					<input class="input" v-if="form.details.rewardType === 'amount'" type="digit"
						v-model="form.details.rewardFen" placeholder="金额（元）" />
					<text class="error" v-if="errors['details.rewardType']">{{ errors['details.rewardType'] }}</text>
					<text class="error" v-if="errors['details.rewardFen']">{{ errors['details.rewardFen'] }}</text>
				</view>
			</template>

			<!-- 闲置字段 -->
			<template v-if="kind === 'idle'">
				<view class="field">
					<text class="label">分类<text class="required">*</text></text>
					<input class="input" v-model="form.details.category" placeholder="如：生活用品" />
					<text class="error" v-if="errors['details.category']">{{ errors['details.category'] }}</text>
				</view>
				<view class="field">
					<text class="label">剩余数量<text class="required">*</text></text>
					<input class="input" type="number" v-model="form.details.remainingQuantity" placeholder="1" />
					<text class="error" v-if="errors['details.remainingQuantity']">{{ errors['details.remainingQuantity'] }}</text>
				</view>
				<view class="field">
					<text class="label">价格类型<text class="required">*</text></text>
					<view class="options">
						<text class="option" :class="{ 'option--active': form.details.priceType === item.value }"
							v-for="item in priceOptions" :key="item.value"
							@click="form.details.priceType = item.value">{{ item.label }}</text>
					</view>
					<input class="input" v-if="form.details.priceType === 'amount'" type="digit"
						v-model="form.details.amountFen" placeholder="金额（元）" />
					<text class="error" v-if="errors['details.priceType']">{{ errors['details.priceType'] }}</text>
					<text class="error" v-if="errors['details.amountFen']">{{ errors['details.amountFen'] }}</text>
				</view>
				<view class="field">
					<text class="label">交接区域<text class="required">*</text></text>
					<input class="input" v-model="form.details.handoverRegion" placeholder="如：五号宿舍楼下" />
					<text class="error" v-if="errors['details.handoverRegion']">{{ errors['details.handoverRegion'] }}</text>
				</view>
			</template>

			<!-- 求购字段 -->
			<template v-if="kind === 'wanted'">
				<view class="field">
					<text class="label">分类<text class="required">*</text></text>
					<input class="input" v-model="form.details.category" placeholder="如：书籍教材" />
					<text class="error" v-if="errors['details.category']">{{ errors['details.category'] }}</text>
				</view>
				<view class="field">
					<text class="label">尚需数量<text class="required">*</text></text>
					<input class="input" type="number" v-model="form.details.neededQuantity" placeholder="1" />
					<text class="error" v-if="errors['details.neededQuantity']">{{ errors['details.neededQuantity'] }}</text>
				</view>
				<view class="field">
					<text class="label">预算</text>
					<view class="options">
						<text class="option" :class="{ 'option--active': form.details.budgetType === item.value }"
							v-for="item in budgetOptions" :key="item.value"
							@click="form.details.budgetType = item.value">{{ item.label }}</text>
					</view>
					<input class="input" v-if="form.details.budgetType === 'amount'" type="digit"
						v-model="form.details.budgetFen" placeholder="预算（元）" />
				</view>
			</template>

			<!-- 校园墙：媒体形式 -->
			<template v-if="kind === 'wall'">
				<view class="field">
					<text class="label">媒体形式<text class="required">*</text></text>
					<view class="options">
						<text class="option" :class="{ 'option--active': form.details.mediaForm === item.value }"
							v-for="item in wallForms" :key="item.value"
							@click="form.details.mediaForm = item.value">{{ item.label }}</text>
					</view>
					<text class="hint">图集与视频互斥；纯文字也可以发布。</text>
				</view>
				<view class="field">
					<text class="label">话题</text>
					<input class="input" v-model="form.details.topic" placeholder="可选，如：社团" />
				</view>
			</template>

			<!-- 正文 -->
			<view class="field">
				<text class="label">{{ kind === 'wall' ? '正文' : '说明' }}</text>
				<textarea class="textarea" v-model="form.body" :maxlength="limits.bodyMax"
					placeholder="补充说明，便于对方判断" />
				<text class="counter">{{ form.body.length }}/{{ limits.bodyMax }}</text>
				<text class="error" v-if="errors.body">{{ errors.body }}</text>
			</view>

			<!-- 媒体上传：依赖 T05 媒体服务 -->
			<view class="field" v-if="kind === 'wall' || kind === 'idle'">
				<text class="label">图片与视频</text>
				<view class="media-placeholder">
					<text class="hint">媒体上传依赖媒体服务（T05），当前仅支持纯文字发布。视频功能会保留，不会被删除。</text>
				</view>
			</view>
		</view>

		<view class="submit-bar">
			<view class="submit" @click="submit">
				<text class="submit-text">提交发布</text>
			</view>
			<text class="submit-note">提交后为「待处理」，审核通过才公开</text>
		</view>
	</view>
</template>

<script>
	import limits from '@/config/limits.json'
	import { submitContent } from '@/services/content.js'
	import { validateForm } from '@/utils/form-validate.js'

	const yuanToFen = (value) => {
		if (value === '' || value === undefined || value === null) return undefined
		const num = Number(value)
		return Number.isFinite(num) ? Math.round(num * 100) : NaN
	}

	export default {
		data() {
			return {
				kind: 'idle',
				limits,
				errors: {},
				submitting: false,
				priceOptions: [{
						value: 'amount',
						label: '金额'
					},
					{
						value: 'negotiable',
						label: '面议'
					},
					{
						value: 'free',
						label: '无偿'
					}
				],
				budgetOptions: [{
						value: 'amount',
						label: '金额'
					},
					{
						value: 'negotiable',
						label: '面议'
					}
				],
				wallForms: [{
						value: 'text',
						label: '纯文字'
					},
					{
						value: 'image',
						label: '图片'
					},
					{
						value: 'video',
						label: '视频'
					}
				],
				form: {
					title: '',
					body: '',
					details: {
						category: '',
						size: '',
						pieces: '1',
						fromRegion: '',
						toRegion: '',
						timeNote: '',
						rewardType: 'negotiable',
						rewardFen: '',
						remainingQuantity: '1',
						priceType: 'negotiable',
						amountFen: '',
						handoverRegion: '',
						neededQuantity: '1',
						budgetType: 'negotiable',
						budgetFen: '',
						mediaForm: 'text',
						topic: ''
					}
				}
			}
		},
		computed: {
			title() {
				return {
					delivery: '发布取送需求',
					idle: '发布闲置',
					wanted: '发布求购',
					wall: '发布校园墙'
				} [this.kind] || '发布'
			},
			requestId() {
				// 每次进入页面生成一个稳定 requestId，避免重复提交产生多条内容
				return this._requestId
			}
		},
		onLoad(query) {
			this.kind = query.kind || 'idle'
			this._requestId = `pub-${Date.now()}-${Math.floor(Math.random() * 100000)}`
		},
		methods: {
			buildPayload() {
				const details = { ...this.form.details }
				// 金额在界面按元输入，提交前转为整数分；非金额类型不带金额
				if (this.kind === 'delivery') {
					details.rewardFen = details.rewardType === 'amount' ? yuanToFen(details.rewardFen) : undefined
				}
				if (this.kind === 'idle') {
					details.amountFen = details.priceType === 'amount' ? yuanToFen(details.amountFen) : undefined
					details.remainingQuantity = Number(details.remainingQuantity)
				}
				if (this.kind === 'wanted') {
					details.budgetFen = details.budgetType === 'amount' ? yuanToFen(details.budgetFen) : undefined
					details.neededQuantity = Number(details.neededQuantity)
				}
				if (this.kind === 'delivery') details.pieces = Number(details.pieces)
				return {
					kind: this.kind,
					title: this.form.title,
					body: this.form.body,
					mediaIds: [],
					details,
					requestId: this._requestId
				}
			},
			validate(payload) {
				this.errors = validateForm(payload, limits)
				return Object.keys(this.errors).length === 0
			},
			async submit() {
				if (this.submitting) return
				const payload = this.buildPayload()
				if (!this.validate(payload)) {
					uni.showToast({
						title: '请检查标红的字段',
						icon: 'none'
					})
					return
				}
				this.submitting = true
				try {
					const result = await submitContent(payload)
					uni.redirectTo({
						url: `/pages/publish/result?id=${result.data.id}&visibility=${result.data.visibility}`
					})
				} catch (error) {
					// 失败时保留草稿在本地，避免用户重填
					uni.setStorageSync(`draft-${this.kind}`, this.form)
					uni.showModal({
						title: '提交失败',
						content: `${error.message}\n草稿已保留在本机。`,
						showCancel: false
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
		padding-bottom: 220rpx;
	}

	.banner {
		padding: 24rpx;
		background-color: $jr-card-bg;
	}

	.banner-title {
		display: block;
		font-size: $jr-font-title;
		font-weight: 600;
		color: $jr-text-main;
	}

	.banner-desc {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		margin-top: 6rpx;
	}

	.card {
		background-color: $jr-card-bg;
		margin: 24rpx;
		border-radius: $jr-radius-card;
		padding: 8rpx 26rpx 26rpx;
	}

	.field {
		padding: 20rpx 0;
		border-bottom: 1rpx solid $jr-border;
	}

	.field:last-child {
		border-bottom: none;
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

	.input {
		height: 76rpx;
		background-color: $jr-page-bg;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		color: $jr-text-main;
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

	.hint {
		display: block;
		font-size: $jr-font-small;
		color: $jr-text-sub;
		line-height: 1.6;
		margin-top: 10rpx;
	}

	.error {
		display: block;
		font-size: $jr-font-small;
		color: $jr-danger;
		margin-top: 8rpx;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 12rpx;
	}

	.option {
		font-size: $jr-font-small;
		color: $jr-text-sub;
		background-color: $jr-page-bg;
		border-radius: $jr-radius-btn;
		padding: 10rpx 28rpx;
		margin: 0 16rpx 12rpx 0;
	}

	.option--active {
		color: #FFFFFF;
		background-color: $jr-primary;
	}

	.media-placeholder {
		background-color: $jr-page-bg;
		border-radius: 8rpx;
		padding: 20rpx;
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

	.submit-text {
		color: #FFFFFF;
		font-size: 32rpx;
	}

	.submit-note {
		display: block;
		text-align: center;
		font-size: 22rpx;
		color: $jr-text-placeholder;
		margin-top: 10rpx;
	}
</style>
