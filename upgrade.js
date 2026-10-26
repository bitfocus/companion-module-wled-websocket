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
]
