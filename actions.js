// Converts a resolved option value to a number. Returns undefined (and logs why) when an
// expression or variable produced something that isn't a number, so no command is sent.
function numberOption(instance, value, label) {
	const number = Number(value)
	if (value === '' || value === null || value === undefined || !Number.isFinite(number)) {
		instance.log('warn', `Invalid ${label} "${value}", command not sent`)
		return undefined
	}
	return number
}

// WLED accepts "t" to toggle a power state on the device itself
function targetPowerState(selectedState) {
	return selectedState == 0 ? true : selectedState == 1 ? false : 't'
}

export function setupActions(instance) {
	instance.setActionDefinitions({
		setState: {
			name: 'Turn On / Turn Off / Toggle',
			description: 'Set the power state of the WLED controller',
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'selectedState',
					default: 0,
					choices: [
						{ id: 0, label: 'Turn On' },
						{ id: 1, label: 'Turn Off' },
						{ id: 2, label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				instance.send({
					on: targetPowerState(action.options.selectedState),
				})
			},
		},
		setSegState: {
			name: 'Turn On / Turn Off / Toggle Segment',
			description: 'Set the power state of a segment',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'selectedState',
					default: 0,
					choices: [
						{ id: 0, label: 'Turn On' },
						{ id: 1, label: 'Turn Off' },
						{ id: 2, label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						on: targetPowerState(action.options.selectedState),
					},
				})
			},
		},
		setBrightness: {
			name: 'Set Brightness',
			description: 'Set the brightness of the WLED controller',
			options: [
				{
					type: 'number',
					label: 'Brightness',
					id: 'targetBrightness',
					default: 127,
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				const bri = numberOption(instance, action.options.targetBrightness, 'brightness')
				if (bri === undefined) return
				instance.send({ bri })
			},
		},
		setSegBrightness: {
			name: 'Set Segment Brightness',
			description: 'Set the brightness of a segment',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
				{
					type: 'number',
					label: 'Brightness',
					id: 'targetBrightness',
					default: 127,
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				const bri = numberOption(instance, action.options.targetBrightness, 'brightness')
				if (bri === undefined) return
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						bri,
					},
				})
			},
		},
		setSegColor: {
			name: 'Set Segment Color',
			description: 'Set the color of a segment',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
				{
					type: 'number',
					label: 'Red (0-255)',
					id: 'red',
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
					default: 128,
				},
				{
					type: 'number',
					label: 'Green (0-255)',
					id: 'green',
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
					default: 128,
				},
				{
					type: 'number',
					label: 'Blue (0-255)',
					id: 'blue',
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
					default: 128,
				},
			],
			callback: async (action) => {
				const segment = instance.getSegment(action.options.selectedSegment)
				if (!segment) return
				// Copy the current colors so the cached state isn't changed before WLED confirms it,
				// and keep the white channel and the secondary/tertiary colors as they are
				const col = (segment.col ?? []).map((color) => (Array.isArray(color) ? [...color] : color))
				const primary = Array.isArray(col[0]) ? col[0] : []
				const rgb = ['red', 'green', 'blue'].map((id) => numberOption(instance, action.options[id], id))
				if (rgb.includes(undefined)) return
				col[0] = [...rgb, ...primary.slice(3)]
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						col: col,
					},
				})
			},
			learn: (action) => {
				const primary = instance.getSegment(action.options.selectedSegment)?.col?.[0]
				if (!Array.isArray(primary)) return undefined
				return {
					red: primary[0],
					green: primary[1],
					blue: primary[2],
				}
			},
		},
		setSegEffectParams: {
			name: 'Set Segment Effect Parameter',
			description: 'Set a effect parameter of a segment',
			options: [
				{
					type: 'dropdown',
					label: 'Parameter',
					id: 'selectedParameter',
					default: 'sx',
					choices: [
						{ id: 'sx', label: 'Speed' },
						{ id: 'ix', label: 'Intensity' },
						{ id: 'c1', label: 'Custom Slider 1' },
						{ id: 'c2', label: 'Custom Slider 2' },
						{ id: 'c3', label: 'Custom Slider 3' },
					],
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'selectedMode',
					default: '',
					choices: [
						{ id: '', label: 'Set to value' },
						{ id: '~', label: 'Increment by' },
						{ id: '~-', label: 'Decrement by' },
					],
				},
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
				{
					type: 'number',
					label: 'Parameter Value',
					id: 'targetParamValue',
					default: 127,
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				const value = numberOption(instance, action.options.targetParamValue, 'parameter value')
				if (value === undefined) return
				// Older saved actions may have a mode of 0, which means "Set to value"
				const mode = action.options.selectedMode || ''
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						[action.options.selectedParameter]: mode ? mode + value : value,
					},
				})
			},
		},
		setLiveOverride: {
			name: 'Live Data Override',
			description: 'Control whether realtime sources (i.e. DDP, DMX, etc) may take over the WLED controller',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'toggle',
					choices: [
						{ id: 'allow', label: 'Allow live data (0)' },
						{ id: 'block', label: 'Block live data (1)' },
						{ id: 'blockReboot', label: 'Block live data until controller reboot (2)' },
						{ id: 'toggle', label: 'Toggle allow / block (0 <-> 1)' },
					],
				},
			],
			callback: async (action) => {
				const modes = { allow: 0, block: 1, blockReboot: 2 }
				const lor = action.options.mode === 'toggle' ? (instance.lor === 0 ? 1 : 0) : modes[action.options.mode]
				instance.send({
					lor: lor,
					// WLED doesn't send the updated state to the websocket upon updating lor; setting "v" to true tells it to return the state manually
					v: true,
				})
			},
		},
		loadPreset: {
			name: 'Load Preset',
			description: 'Load a previously saved preset',
			options: [
				{
					type: 'number',
					label: 'Preset',
					id: 'targetPreset',
					default: 1,
					min: 0,
					max: 250,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				const ps = numberOption(instance, action.options.targetPreset, 'preset')
				if (ps === undefined) return
				instance.send({ ps })
			},
		},
	})
}
