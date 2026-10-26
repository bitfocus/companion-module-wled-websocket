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

const brightnessOptions = [
	{
		type: 'dropdown',
		label: 'Mode',
		id: 'mode',
		default: 'set',
		disableAutoExpression: true,
		choices: [
			{ id: 'set', label: 'Set to value' },
			{ id: 'inc', label: 'Increase by' },
			{ id: 'dec', label: 'Decrease by' },
		],
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
	{
		type: 'checkbox',
		label: 'Allow dimming to off',
		id: 'allowOff',
		default: false,
		tooltip: 'When decreasing, let the brightness reach 0, which turns the lights off',
		isVisibleExpression: `$(options:mode) == 'dec'`,
	},
]

// Builds the WLED brightness value. Relative changes use WLED's "min~max~step" syntax,
// so the device clamps the result instead of us relying on possibly stale cached state.
function brightnessValue(instance, options) {
	const value = numberOption(instance, options.targetBrightness, 'brightness')
	if (value === undefined) return undefined
	if (options.mode === 'inc' || options.mode === 'dec') {
		if (!value) return undefined
		const min = options.mode === 'dec' && options.allowOff ? 0 : 1
		return `${min}~255~${options.mode === 'dec' ? -value : value}`
	}
	return value
}

// Splits a color picker number (0xRRGGBB) into [r, g, b]
function splitColor(color) {
	const value = Number(color)
	return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
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
					disableAutoExpression: true,
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
					disableAutoExpression: true,
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
			description: 'Set, increase or decrease the brightness of the WLED controller',
			options: brightnessOptions,
			callback: async (action) => {
				const bri = brightnessValue(instance, action.options)
				if (bri === undefined) return
				instance.send({ bri })
			},
		},
		setSegBrightness: {
			name: 'Set Segment Brightness',
			description: 'Set, increase or decrease the brightness of a segment',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
				...brightnessOptions,
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				const bri = brightnessValue(instance, action.options)
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
			description: 'Set one of the colors of a segment',
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
					label: 'Color slot',
					id: 'slot',
					default: 0,
					choices: [
						{ id: 0, label: 'Primary' },
						{ id: 1, label: 'Secondary' },
						{ id: 2, label: 'Tertiary' },
					],
				},
				{
					type: 'colorpicker',
					label: 'Color',
					id: 'color',
					default: 0x808080,
					returnType: 'number',
				},
				{
					type: 'checkbox',
					label: 'Set white channel',
					id: 'setWhite',
					default: false,
					disableAutoExpression: true,
					tooltip: 'For RGBW strips. When off, the current white value is kept',
				},
				{
					type: 'number',
					label: 'White (0-255)',
					id: 'white',
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
					default: 0,
					isVisibleExpression: '$(options:setWhite)',
				},
			],
			callback: async (action) => {
				const segment = instance.getSegment(action.options.selectedSegment)
				if (!segment) return
				const slot = Number(action.options.slot) || 0
				// Copy the current colors so the cached state isn't changed before WLED confirms it,
				// and keep the other slots (and the white channel, unless it is being set) as they are
				const col = (segment.col ?? []).map((color) => (Array.isArray(color) ? [...color] : color))
				while (col.length <= slot) col.push([0, 0, 0])
				const current = Array.isArray(col[slot]) ? col[slot] : []
				const color = numberOption(instance, action.options.color, 'color')
				const white = action.options.setWhite ? numberOption(instance, action.options.white, 'white') : undefined
				if (color === undefined || (action.options.setWhite && white === undefined)) return
				col[slot] = [...splitColor(color), ...(action.options.setWhite ? [white] : current.slice(3))]
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						col: col,
					},
				})
			},
			learn: (action) => {
				const slot = Number(action.options.slot) || 0
				const current = instance.getSegment(action.options.selectedSegment)?.col?.[slot]
				if (!Array.isArray(current)) return undefined
				const learned = { color: (current[0] << 16) | (current[1] << 8) | current[2] }
				if (current.length > 3) {
					learned.white = current[3]
				}
				return learned
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
		setSegEffect: {
			name: 'Set Segment Effect',
			description: 'Set the effect of a segment',
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
					label: 'Effect',
					id: 'effect',
					default: 0,
					choices: instance.getEffectChoices(),
				},
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						fx: Number(action.options.effect),
					},
				})
			},
			learn: (action) => {
				const segment = instance.getSegment(action.options.selectedSegment)
				if (!segment) return undefined
				return { effect: segment.fx }
			},
		},
		setSegPalette: {
			name: 'Set Segment Palette',
			description: 'Set the color palette of a segment',
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
					label: 'Palette',
					id: 'palette',
					default: 0,
					choices: instance.getPaletteChoices(),
				},
			],
			callback: async (action) => {
				if (!instance.getSegment(action.options.selectedSegment)) return
				instance.send({
					seg: {
						id: Number(action.options.selectedSegment),
						pal: Number(action.options.palette),
					},
				})
			},
			learn: (action) => {
				const segment = instance.getSegment(action.options.selectedSegment)
				if (!segment) return undefined
				return { palette: segment.pal }
			},
		},
		loadPreset: {
			name: 'Load Preset',
			description: 'Load a previously saved preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'targetPreset',
					default: 1,
					choices: instance.getPresetChoices(),
					// Allows presets that haven't been loaded yet to be entered by number
					allowCustom: true,
					regex: '/^\\d+$/',
				},
			],
			callback: async (action) => {
				const preset = numberOption(instance, action.options.targetPreset, 'preset')
				if (preset === undefined) return
				if (!Number.isInteger(preset) || preset < 1) {
					instance.log('warn', `Invalid preset "${action.options.targetPreset}", command not sent`)
					return
				}
				instance.send({ ps: preset })
			},
		},
		cyclePreset: {
			name: 'Next / Previous Preset',
			description: 'Step through a range of presets, wrapping around at the ends, or pick a random one from the range',
			options: [
				{
					type: 'dropdown',
					label: 'Direction',
					id: 'direction',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next' },
						{ id: 'previous', label: 'Previous' },
						{ id: 'random', label: 'Random' },
					],
				},
				{
					type: 'number',
					label: 'First preset',
					id: 'first',
					default: 1,
					min: 1,
					max: 250,
					clampValues: true,
					asInteger: true,
				},
				{
					type: 'number',
					label: 'Last preset',
					id: 'last',
					default: 10,
					min: 1,
					max: 250,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				const first = numberOption(instance, action.options.first, 'first preset')
				const last = numberOption(instance, action.options.last, 'last preset')
				if (first === undefined || last === undefined) return
				if (first >= last) {
					instance.log('warn', `First preset (${first}) must be lower than last preset (${last}), command not sent`)
					return
				}
				// WLED cycles with "first~last~" (next), "first~last~-" (previous) and picks at random with "first~lastr"
				const suffix = { next: '~', previous: '~-', random: 'r' }[action.options.direction] ?? '~'
				instance.send({ ps: `${first}~${last}${suffix}` })
			},
		},
		playlistControl: {
			name: 'Playlist Control',
			description: 'Skip to the next entry of the running playlist, or stop it. To start a playlist, load its preset.',
			options: [
				{
					type: 'dropdown',
					label: 'Command',
					id: 'command',
					default: 'next',
					choices: [
						{ id: 'next', label: 'Next entry' },
						{ id: 'stop', label: 'Stop' },
					],
				},
			],
			callback: async (action) => {
				if (action.options.command === 'stop') {
					// WLED unloads a running playlist when an effect is set outside a preset; "~0" keeps the current effect
					instance.send({ seg: { fx: '~0' } })
				} else {
					instance.send({ np: true })
				}
			},
		},
		setTransition: {
			name: 'Set Transition Time',
			description: 'Set how long WLED takes to fade between changes',
			options: [
				{
					type: 'number',
					label: 'Transition time (seconds)',
					id: 'seconds',
					default: 0.7,
					min: 0,
					max: 65,
					step: 0.1,
					clampValues: true,
				},
				{
					type: 'checkbox',
					label: 'Only for the next change',
					id: 'once',
					default: false,
					tooltip: 'Use this transition for the next change only, then return to the normal transition time',
				},
			],
			callback: async (action) => {
				const seconds = numberOption(instance, action.options.seconds, 'transition time')
				if (seconds === undefined) return
				// WLED counts transitions in tenths of a second
				const tenths = Math.round(seconds * 10)
				instance.send(action.options.once ? { tt: tenths } : { transition: tenths })
			},
		},
		nightLight: {
			name: 'Night Light',
			description:
				'Turn the night light timer on or off. It fades or switches to the target brightness over the duration.',
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'selectedState',
					default: 0,
					disableAutoExpression: true,
					choices: [
						{ id: 0, label: 'Turn On' },
						{ id: 1, label: 'Turn Off' },
						{ id: 2, label: 'Toggle' },
					],
				},
				{
					type: 'number',
					label: 'Duration (minutes)',
					id: 'duration',
					default: 60,
					min: 1,
					max: 255,
					clampValues: true,
					asInteger: true,
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 1,
					choices: [
						{ id: 0, label: 'Instant (switch at the end)' },
						{ id: 1, label: 'Fade' },
						{ id: 2, label: 'Color fade' },
						{ id: 3, label: 'Sunrise' },
					],
				},
				{
					type: 'number',
					label: 'Target brightness',
					id: 'targetBrightness',
					default: 0,
					min: 0,
					max: 255,
					clampValues: true,
					asInteger: true,
				},
			],
			callback: async (action) => {
				const duration = numberOption(instance, action.options.duration, 'duration')
				const targetBrightness = numberOption(instance, action.options.targetBrightness, 'target brightness')
				if (duration === undefined || targetBrightness === undefined) return
				instance.send({
					nl: {
						on: targetPowerState(action.options.selectedState),
						dur: duration,
						mode: Number(action.options.mode),
						tbri: targetBrightness,
					},
				})
			},
		},
	})
}
