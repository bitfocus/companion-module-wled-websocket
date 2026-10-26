import { combineRgb } from '@companion-module/base'

const white = combineRgb(255, 255, 255)
const black = combineRgb(0, 0, 0)
const green = combineRgb(0, 204, 0)
const red = combineRgb(204, 0, 0)

// A curated set of effects that every recent WLED build has, by their (stable) effect id
const EFFECTS = [
	{ id: 0, name: 'Solid' },
	{ id: 2, name: 'Breathe' },
	{ id: 8, name: 'Colorloop' },
	{ id: 9, name: 'Rainbow' },
	{ id: 17, name: 'Twinkle' },
	{ id: 20, name: 'Sparkle' },
	{ id: 28, name: 'Chase' },
	{ id: 38, name: 'Aurora' },
	{ id: 42, name: 'Fireworks' },
	{ id: 66, name: 'Fire 2012' },
	{ id: 88, name: 'Candle' },
	{ id: 101, name: 'Pacifica' },
]

const COLORS = [
	{ id: 'red', name: 'Red', color: combineRgb(255, 0, 0) },
	{ id: 'green', name: 'Green', color: combineRgb(0, 255, 0) },
	{ id: 'blue', name: 'Blue', color: combineRgb(0, 0, 255) },
	{ id: 'white', name: 'White', color: combineRgb(255, 255, 255) },
	{ id: 'warm_white', name: 'Warm White', color: combineRgb(255, 180, 107) },
]

function style(text, bgcolor = black) {
	return { text, size: 'auto', color: white, bgcolor }
}

function expression(value) {
	return { isExpression: true, value }
}

// Builds the ready-made buttons. Most are fixed; the preset and segment groups are templates whose
// values come from the WLED (like the Videohub module's inputs and outputs), so this is called again
// whenever the presets or segments change.
export function setupPresets(instance) {
	// Variables are referenced through the connection's label, e.g. $(wled:brightness)
	const v = (variable) => `$(${instance.label}:${variable})`
	const presets = {}

	// Power & brightness
	presets.power_toggle = {
		type: 'simple',
		name: 'Power toggle',
		style: style(`Power\\n${v('brightness')}`),
		steps: [{ down: [{ actionId: 'setState', options: { selectedState: 2 } }], up: [] }],
		feedbacks: [{ feedbackId: 'powerState', options: {}, style: { bgcolor: green, color: white } }],
	}
	presets.brightness_dial = {
		type: 'simple',
		name: 'Brightness dial (turn to dim, press to toggle power)',
		style: style(`Bright\\n${v('brightness')}`),
		steps: [
			{
				down: [{ actionId: 'setState', options: { selectedState: 2 } }],
				up: [],
				rotate_left: [{ actionId: 'setBrightness', options: { mode: 'dec', targetBrightness: 10, allowOff: false } }],
				rotate_right: [{ actionId: 'setBrightness', options: { mode: 'inc', targetBrightness: 10, allowOff: false } }],
			},
		],
		feedbacks: [{ feedbackId: 'powerState', options: {}, style: { bgcolor: green, color: white } }],
	}
	const brightnessLevels = [25, 50, 75, 100]
	for (const percent of brightnessLevels) {
		presets[`brightness_${percent}`] = {
			type: 'simple',
			name: `Brightness ${percent}%`,
			style: style(`${percent}%`),
			steps: [
				{
					down: [
						{
							actionId: 'setBrightness',
							options: { mode: 'set', targetBrightness: Math.round((percent / 100) * 255), allowOff: false },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	// Presets and playlists
	presets.preset_load = {
		type: 'simple',
		name: 'Load preset',
		style: style(v('preset_$(local:preset)_name')),
		localVariables: [{ variableType: 'simple', variableName: 'preset', startupValue: 1 }],
		steps: [{ down: [{ actionId: 'loadPreset', options: { targetPreset: expression('$(local:preset)') } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'presetActive',
				options: { preset: expression('$(local:preset)') },
				style: { bgcolor: green, color: white },
			},
		],
	}
	const presetIds = Object.keys(instance.presets)
		.map(Number)
		.sort((a, b) => a - b)
	const first = presetIds[0] ?? 1
	const last = presetIds[presetIds.length - 1] ?? 10
	for (const direction of ['previous', 'next']) {
		presets[`preset_${direction}`] = {
			type: 'simple',
			name: `${direction === 'next' ? 'Next' : 'Previous'} preset`,
			style: style(`${direction === 'next' ? 'Next' : 'Prev'}\\npreset`),
			steps: [
				{
					down: [
						{
							actionId: 'cyclePreset',
							options: { direction, first, last: Math.max(last, first + 1) },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}
	presets.playlist_next = {
		type: 'simple',
		name: 'Playlist: next entry',
		style: style('Playlist\\nnext'),
		steps: [{ down: [{ actionId: 'playlistControl', options: { command: 'next' } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'playlistRunning', options: { playlist: 'any' }, style: { bgcolor: green, color: white } },
		],
	}
	presets.playlist_stop = {
		type: 'simple',
		name: 'Playlist: stop',
		style: style('Playlist\\nstop'),
		steps: [{ down: [{ actionId: 'playlistControl', options: { command: 'stop' } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'playlistRunning', options: { playlist: 'any' }, style: { bgcolor: green, color: white } },
		],
	}
	presets.nightlight_toggle = {
		type: 'simple',
		name: 'Night light toggle (fades to off over 60 minutes)',
		style: style(`Night\\n${v('nightlight_remaining')}s`),
		steps: [
			{
				down: [
					{
						actionId: 'nightLight',
						options: { selectedState: 2, duration: 60, mode: 1, targetBrightness: 0 },
					},
				],
				up: [],
			},
		],
		feedbacks: [{ feedbackId: 'nightLightOn', options: {}, style: { bgcolor: green, color: white } }],
	}

	// Segments: the template value is the segment number counting from 1, as in the variable names,
	// while the actions and feedbacks count from 0
	const segment = expression('$(local:segment) - 1')
	const segmentName = v('segment_$(local:segment)_name')
	const segmentVariable = [{ variableType: 'simple', variableName: 'segment', startupValue: 1 }]
	presets.segment_power = {
		type: 'simple',
		name: 'Segment power toggle',
		style: style(segmentName),
		localVariables: segmentVariable,
		steps: [{ down: [{ actionId: 'setSegState', options: { selectedSegment: segment, selectedState: 2 } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'segPowerState', options: { selectedSegment: segment }, style: { bgcolor: green, color: white } },
		],
	}
	presets.segment_brightness_dial = {
		type: 'simple',
		name: 'Segment brightness dial (turn to dim, press to toggle)',
		style: style(`${segmentName}\\n${v('segment_$(local:segment)_brightness')}`),
		localVariables: segmentVariable,
		steps: [
			{
				down: [{ actionId: 'setSegState', options: { selectedSegment: segment, selectedState: 2 } }],
				up: [],
				rotate_left: [
					{
						actionId: 'setSegBrightness',
						options: { selectedSegment: segment, mode: 'dec', targetBrightness: 10, allowOff: false },
					},
				],
				rotate_right: [
					{
						actionId: 'setSegBrightness',
						options: { selectedSegment: segment, mode: 'inc', targetBrightness: 10, allowOff: false },
					},
				],
			},
		],
		feedbacks: [
			{ feedbackId: 'segPowerState', options: { selectedSegment: segment }, style: { bgcolor: green, color: white } },
		],
	}
	presets.segment_freeze = {
		type: 'simple',
		name: 'Segment freeze toggle',
		style: style(`Freeze\\n${segmentName}`),
		localVariables: segmentVariable,
		steps: [
			{
				down: [{ actionId: 'setSegOption', options: { selectedSegment: segment, option: 'frz', selectedState: 2 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'segOption',
				options: { selectedSegment: segment, option: 'frz' },
				style: { bgcolor: green, color: white },
			},
		],
	}

	// Effects (on the first segment) and the effect slider dials
	for (const effect of EFFECTS) {
		presets[`effect_${effect.id}`] = {
			type: 'simple',
			name: `Effect: ${effect.name}`,
			style: style(effect.name),
			steps: [{ down: [{ actionId: 'setSegEffect', options: { selectedSegment: 0, effect: effect.id } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'segEffect',
					options: { selectedSegment: 0, effect: effect.id },
					style: { bgcolor: green, color: white },
				},
			],
		}
	}
	for (const slider of [
		{ id: 'sx', variable: 'speed' },
		{ id: 'ix', variable: 'intensity' },
	]) {
		const step = (mode) => [
			{
				actionId: 'setSegEffectParams',
				options: { selectedParameter: slider.id, selectedMode: mode, selectedSegment: 0, targetParamValue: 10 },
			},
		]
		presets[`effect_${slider.variable}_dial`] = {
			type: 'simple',
			name: `Effect ${slider.variable} dial (named after what the current effect calls it)`,
			style: style(`${v(`segment_1_${slider.variable}_label`)}\\n${v(`segment_1_effect_${slider.variable}`)}`),
			steps: [{ down: [], up: [], rotate_left: step('~-'), rotate_right: step('~') }],
			feedbacks: [],
		}
	}

	// Colors (primary color of the first segment)
	for (const color of COLORS) {
		presets[`color_${color.id}`] = {
			type: 'simple',
			name: `Color: ${color.name}`,
			style: style(color.name, color.color),
			previewStyle: { color: color.id === 'white' || color.id === 'warm_white' ? black : white },
			steps: [
				{
					down: [
						{
							actionId: 'setSegColor',
							options: { selectedSegment: 0, slot: 0, color: color.color, setWhite: false, white: 0 },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	// Device
	presets.live_override_toggle = {
		type: 'simple',
		name: 'Live data override toggle',
		style: style('Block\\nlive data'),
		steps: [{ down: [{ actionId: 'setLiveOverride', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'liveDataOverride', options: {}, style: { bgcolor: red, color: white } }],
	}
	presets.sync_send_toggle = {
		type: 'simple',
		name: 'Sync send toggle',
		style: style('Sync\\nsend'),
		steps: [{ down: [{ actionId: 'setSyncSend', options: { selectedState: 2 } }], up: [] }],
		feedbacks: [{ feedbackId: 'syncState', options: { direction: 'send' }, style: { bgcolor: green, color: white } }],
	}

	const segmentValues = []
	for (let i = 1; i <= Math.max(instance.segmentCount, 1); i++) {
		segmentValues.push({ name: instance.segments[i - 1]?.n || `Segment ${i}`, value: i })
	}
	const segmentTemplate = (id, name, presetId) => ({
		id,
		type: 'template',
		name,
		presetId,
		templateVariableName: 'segment',
		templateValues: segmentValues,
	})

	const structure = [
		{
			id: 'power',
			name: 'Power & Brightness',
			definitions: ['power_toggle', 'brightness_dial', ...brightnessLevels.map((percent) => `brightness_${percent}`)],
		},
		{
			id: 'presets',
			name: 'Presets & Playlists',
			definitions: [
				{
					id: 'preset_buttons',
					type: 'template',
					name: 'Load preset',
					description: 'One button per preset saved on the WLED',
					presetId: 'preset_load',
					templateVariableName: 'preset',
					templateValues: presetIds.map((id) => ({
						name: instance.playlists.has(id)
							? `${id}: ${instance.presets[id]} (playlist)`
							: `${id}: ${instance.presets[id]}`,
						value: id,
					})),
				},
				{
					id: 'preset_controls',
					type: 'simple',
					name: 'Preset & playlist controls',
					presets: ['preset_previous', 'preset_next', 'playlist_next', 'playlist_stop', 'nightlight_toggle'],
				},
			],
		},
		{
			id: 'segments',
			name: 'Segments',
			definitions: [
				segmentTemplate('segment_power_buttons', 'Segment power', 'segment_power'),
				segmentTemplate('segment_brightness_buttons', 'Segment brightness dials', 'segment_brightness_dial'),
				segmentTemplate('segment_freeze_buttons', 'Segment freeze', 'segment_freeze'),
			],
		},
		{
			id: 'effects',
			name: 'Effects',
			definitions: [...EFFECTS.map((effect) => `effect_${effect.id}`), 'effect_speed_dial', 'effect_intensity_dial'],
		},
		{
			id: 'colors',
			name: 'Colors',
			definitions: COLORS.map((color) => `color_${color.id}`),
		},
		{
			id: 'device',
			name: 'Device',
			definitions: ['live_override_toggle', 'sync_send_toggle'],
		},
	]

	instance.setPresetDefinitions(structure, presets)
}
