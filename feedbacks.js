import { combineRgb } from '@companion-module/base'

export function setupFeedbacks(instance) {
	instance.setFeedbackDefinitions({
		powerState: {
			type: 'boolean',
			name: 'Is on',
			description: 'True when the led is turned on, false when it is not.',
			options: [],
			callback: (feedback, context) => {
				return instance.isOn
			},
		},
		segPowerState: {
			type: 'boolean',
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
				if (segment) {
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
				if (segment) {
					return { text: String(segment[feedback.options.selectedParameter]) }
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
		liveDataOverride: {
			type: 'boolean',
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
