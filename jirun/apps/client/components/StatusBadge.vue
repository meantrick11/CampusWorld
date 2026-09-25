<template>
	<text class="badge" :class="`badge--${tone}`">{{ label }}</text>
</template>

<script>
	import {
		BUSINESS_STATUS_TEXT,
		REVIEW_STATUS_TEXT,
		REVIEW_TONE
	} from '@/utils/status.js'

	export default {
		name: 'StatusBadge',
		props: {
			// 业务状态（seeking/available/...）或审核状态（pending/approved/...）
			status: {
				type: String,
				default: ''
			},
			// business：供需状态；review：审核与可见性
			scope: {
				type: String,
				default: 'business'
			},
			kind: {
				type: String,
				default: ''
			}
		},
		computed: {
			label() {
				if (!this.status) return ''
				if (this.scope === 'review') return REVIEW_STATUS_TEXT[this.status] || this.status
				return BUSINESS_STATUS_TEXT[this.status] || this.status
			},
			tone() {
				if (!this.status) return 'plain'
				if (this.scope === 'review') return REVIEW_TONE[this.status] || 'plain'
				return ['seeking', 'available', 'contacted'].includes(this.status) ? 'active' : 'plain'
			}
		}
	}
</script>

<style lang="scss" scoped>
	.badge {
		display: inline-block;
		font-size: $jr-font-small;
		line-height: 1.4;
		padding: 2rpx 14rpx;
		border-radius: $jr-radius-tag;
		white-space: nowrap;
	}

	.badge--active {
		color: $jr-primary;
		background-color: $jr-primary-light;
	}

	.badge--warn {
		color: $jr-warning;
		background-color: rgba(217, 131, 36, 0.12);
	}

	.badge--danger {
		color: $jr-danger;
		background-color: rgba(192, 57, 43, 0.1);
	}

	.badge--success {
		color: $jr-success;
		background-color: rgba(46, 158, 107, 0.12);
	}

	.badge--plain {
		color: $jr-text-sub;
		background-color: $jr-page-bg;
	}
</style>
