export const upgradeScripts = [
	// Add defaults for the polling config fields
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config) {
			let changed = false
			if (props.config.polling === undefined) {
				props.config.polling = false
				changed = true
			}
			if (props.config.interval === undefined) {
				props.config.interval = 1000
				changed = true
			}
			if (changed) {
				result.updatedConfig = props.config
			}
		}

		return result
	},

	// Set Segment Color: replace the red/green/blue number fields with a color picker
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			if (action.actionId !== 'setSegColor' || action.options.color !== undefined) continue

			const channels = ['red', 'green', 'blue'].map((id) => action.options[id] ?? { isExpression: false, value: 128 })
			if (channels.some((channel) => channel.isExpression)) {
				// Combine expressions into one that produces the 0xRRGGBB number
				const parts = channels.map((channel) =>
					channel.isExpression ? `(${channel.value})` : `${Number(channel.value)}`,
				)
				action.options.color = {
					isExpression: true,
					value: `${parts[0]} * 65536 + ${parts[1]} * 256 + ${parts[2]}`,
				}
			} else {
				const [r, g, b] = channels.map((channel) => Number(channel.value) & 0xff)
				action.options.color = { isExpression: false, value: (r << 16) | (g << 8) | b }
			}
			action.options.slot = { isExpression: false, value: 0 }
			action.options.setWhite = { isExpression: false, value: false }
			action.options.white = { isExpression: false, value: 0 }
			delete action.options.red
			delete action.options.green
			delete action.options.blue
			result.updatedActions.push(action)
		}

		return result
	},

	// Set Brightness / Set Segment Brightness: actions saved before the Mode option existed have no
	// value for it, which Companion rejects, so default them to "Set to value"
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			if (action.actionId !== 'setBrightness' && action.actionId !== 'setSegBrightness') continue
			if (action.options.mode !== undefined) continue

			action.options.mode = { isExpression: false, value: 'set' }
			action.options.allowOff = { isExpression: false, value: false }
			result.updatedActions.push(action)
		}

		return result
	},

	// Set Segment Effect Parameter: module versions 1.0.x saved an unchanged Mode as 0, which isn't one of
	// the choices, so store it as '' ("Set to value")
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			if (action.actionId !== 'setSegEffectParams') continue
			const mode = action.options.selectedMode
			if (mode !== undefined && (mode.isExpression || (mode.value !== 0 && mode.value !== '0'))) continue

			action.options.selectedMode = { isExpression: false, value: '' }
			result.updatedActions.push(action)
		}

		return result
	},
]
