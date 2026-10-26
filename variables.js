export function setupVariables(instance) {
	let variables = [
		{ variableId: 'power', name: 'Global Power' },
		{ variableId: 'brightness', name: 'Global Brightness' },
		{ variableId: 'preset', name: 'Current Preset' },
		{ variableId: 'preset_name', name: 'Current Preset Name' },
		{ variableId: 'version', name: 'WLED Version' },
		{ variableId: 'processor', name: 'WLED Processor' },
		{ variableId: 'led_count', name: 'LED Count' },
		{ variableId: 'current', name: 'Current (mA)' },
		{ variableId: 'max_current', name: 'Max Current (mA)' },
		{ variableId: 'name', name: 'WLED Name' },
		{ variableId: 'free_heap', name: 'Free Heap' },
		{ variableId: 'uptime', name: 'Uptime' },
		{ variableId: 'ip_address', name: 'IP Address' },
	]

	for (let i = 0; i < instance.segmentCount; i++) {
		variables.push(
			{ variableId: `segment_${i + 1}_power`, name: `Segment ${i + 1} Power` },
			{ variableId: `segment_${i + 1}_brightness`, name: `Segment ${i + 1} Brightness` },
			{ variableId: `segment_${i + 1}_color`, name: `Segment ${i + 1} Color` },
			{ variableId: `segment_${i + 1}_effect`, name: `Segment ${i + 1} Effect` },
			{ variableId: `segment_${i + 1}_effect_name`, name: `Segment ${i + 1} Effect Name` },
			{ variableId: `segment_${i + 1}_palette`, name: `Segment ${i + 1} Palette` },
			{ variableId: `segment_${i + 1}_palette_name`, name: `Segment ${i + 1} Palette Name` },
			{ variableId: `segment_${i + 1}_effect_speed`, name: `Segment ${i + 1} Effect Speed` },
			{ variableId: `segment_${i + 1}_effect_intensity`, name: `Segment ${i + 1} Effect Intensity` },
			{ variableId: `segment_${i + 1}_effect_custom_1`, name: `Segment ${i + 1} Effect Custom Slider 1` },
			{ variableId: `segment_${i + 1}_effect_custom_2`, name: `Segment ${i + 1} Effect Custom Slider 2` },
			{ variableId: `segment_${i + 1}_effect_custom_3`, name: `Segment ${i + 1} Effect Custom Slider 3` },
		)
	}
	instance.setVariableDefinitions(Object.fromEntries(variables.map(({ variableId, name }) => [variableId, { name }])))
}

// WLED reports segment colors as `col`: [primary, secondary, tertiary], each [r, g, b] or [r, g, b, w].
// Returns the primary color as "#RRGGBB".
function primaryColorHex(col) {
	const primary = col?.[0]
	if (typeof primary === 'string') return '#' + primary.slice(0, 6).toUpperCase()
	if (!Array.isArray(primary) || primary.length < 3) return undefined
	return (
		'#' +
		primary
			.slice(0, 3)
			.map((c) => Number(c).toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()
	)
}

export function parseWLEDVariables(instance, data) {
	let variables = {}
	if (data.state != null) {
		variables['power'] = data.state.on ?? 'unknown'
		variables['brightness'] = data.state.bri ?? 'unknown'
		variables['preset'] = data.state.ps == -1 ? 'none' : (data.state.ps ?? 'unknown')
		variables['preset_name'] = data.state.ps == -1 ? 'none' : (instance.presets[data.state.ps] ?? 'unknown')
		if (data.state.seg != null) {
			for (let i = 0; i < instance.segmentCount; i++) {
				variables[`segment_${i + 1}_power`] = data.state.seg[i]?.on ?? 'unknown'
				variables[`segment_${i + 1}_brightness`] = data.state.seg[i]?.bri ?? 'unknown'
				variables[`segment_${i + 1}_color`] = primaryColorHex(data.state.seg[i]?.col) ?? 'unknown'
				variables[`segment_${i + 1}_effect`] = data.state.seg[i]?.fx ?? 'unknown'
				variables[`segment_${i + 1}_effect_name`] = instance.effects[data.state.seg[i]?.fx] ?? 'unknown'
				variables[`segment_${i + 1}_palette`] = data.state.seg[i]?.pal ?? 'unknown'
				variables[`segment_${i + 1}_palette_name`] = instance.palettes[data.state.seg[i]?.pal] ?? 'unknown'
				variables[`segment_${i + 1}_effect_speed`] = data.state.seg[i]?.sx ?? 'unknown'
				variables[`segment_${i + 1}_effect_intensity`] = data.state.seg[i]?.ix ?? 'unknown'
				variables[`segment_${i + 1}_effect_custom_1`] = data.state.seg[i]?.c1 ?? 'unknown'
				variables[`segment_${i + 1}_effect_custom_2`] = data.state.seg[i]?.c2 ?? 'unknown'
				variables[`segment_${i + 1}_effect_custom_3`] = data.state.seg[i]?.c3 ?? 'unknown'
			}
		}
	}
	if (data.info != null) {
		variables['version'] = data.info.ver ?? 'unknown'
		variables['processor'] = data.info.arch ?? 'unknown'
		variables['led_count'] = data.info.leds?.count ?? 'unknown'
		variables['current'] = data.info.leds?.pwr ?? 'unknown'
		variables['max_current'] = data.info.leds?.maxpwr ?? 'unknown'
		variables['name'] = data.info.name ?? 'unknown'
		variables['free_heap'] = data.info.freeheap ?? 'unknown'
		variables['uptime'] = data.info.uptime ?? 'unknown'
		variables['ip_address'] = data.info.ip ?? 'unknown'
	}

	// Only send values that differ from what Companion already has
	let changedVariables = {}
	for (const [variableId, value] of Object.entries(variables)) {
		if (instance.getVariableValue(variableId) !== value) {
			changedVariables[variableId] = value
		}
	}
	if (Object.keys(changedVariables).length > 0) {
		instance.setVariableValues(changedVariables)
	}
}
