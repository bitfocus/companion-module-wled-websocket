import { combineRgb } from '@companion-module/base'

// Default look for boolean feedbacks when they are true
const activeStyle = { bgcolor: combineRgb(0, 204, 0), color: combineRgb(255, 255, 255) }

export function setupFeedbacks(instance) {
	instance.setFeedbackDefinitions({
		powerState: {
			type: 'boolean',
			defaultStyle: activeStyle,
			name: 'Is on',
			description: 'True when the led is turned on, false when it is not.',
			options: [],
			callback: (feedback, context) => {
				return instance.isOn
			},
		},
		segPowerState: {
			type: 'boolean',
			defaultStyle: activeStyle,
			name: 'Segment is on',
			description: 'True when the selected segment is turned on, false when it is not.',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
			],
			callback: (feedback, context) => {
				return instance.getSegment(feedback.options.selectedSegment)?.on === true
			},
		},
		brightness: {
			type: 'advanced',
			name: 'Brightness',
			description: 'Returns the current brightness (0-255)',
			options: [],
			callback: (feedback, context) => {
				return { text: String(instance.brightness) }
			},
		},
		segBrightness: {
			type: 'advanced',
			name: 'Segment Brightness',
			description: 'Returns the current brightness of a segment(0-255)',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
			],
			callback: (feedback, context) => {
				const segment = instance.getSegment(feedback.options.selectedSegment)
				if (segment?.bri !== undefined) {
					return { text: String(segment.bri) }
				}
				return {}
			},
		},
		segFxParam: {
			type: 'advanced',
			name: 'Segment Effect Parameter',
			description: 'Returns the current state of defined effect parameter in a segment (0-255)',
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
			],
			callback: (feedback, context) => {
				const segment = instance.getSegment(feedback.options.selectedSegment)
				const value = segment?.[feedback.options.selectedParameter]
				if (value !== undefined) {
					return { text: String(value) }
				}
				return {}
			},
		},
		segColor: {
			type: 'advanced',
			name: 'Segment Color',
			description: 'Returns the current color of defined segment',
			options: [
				{
					type: 'dropdown',
					label: 'Segment',
					id: 'selectedSegment',
					default: 0,
					choices: instance.getSegmentChoices(),
				},
			],
			callback: (feedback, context) => {
				const colorArray = instance.getSegment(feedback.options.selectedSegment)?.col?.[0]
				if (Array.isArray(colorArray)) {
					return { bgcolor: combineRgb(colorArray[0], colorArray[1], colorArray[2]) }
				}
				return {}
			},
		},
		segEffect: {
			type: 'boolean',
			defaultStyle: activeStyle,
			name: 'Segment effect is',
			description: 'True when the selected segment is running the selected effect',
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
			callback: (feedback) => {
				const segment = instance.getSegment(feedback.options.selectedSegment)
				return segment !== undefined && segment.fx === Number(feedback.options.effect)
			},
		},
		presetActive: {
			type: 'boolean',
			defaultStyle: activeStyle,
			name: 'Preset is active',
			description: 'True when the selected preset is the one currently loaded',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: 1,
					choices: instance.getPresetChoices(),
					allowCustom: true,
					regex: '/^\\d+$/',
				},
			],
			callback: (feedback) => {
				return instance.state?.ps === Number(feedback.options.preset)
			},
		},
		liveDataOverride: {
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(204, 0, 0), color: combineRgb(255, 255, 255) },
			name: 'Live Data Override',
			description:
				'True when live data override is enabled (whether temporary, or until reboot), false when it is not.',
			options: [],
			callback: (feedback, context) => {
				return !!instance.lor
			},
		},
	})
}
