export function setupActions(instance) {
    instance.setActionDefinitions({
        setState: {
            name: "Turn On / Turn Off / Toggle",
            description: "Set the power state of the WLED controller",
            options: [
                {
                    type: 'dropdown',
                    label: 'State',
                    id: 'selectedState',
                    default: 0,
                    choices: [
                        { id: 0, label: "Turn On" },
                        { id: 1, label: "Turn Off" },
                        { id: 2, label: "Toggle" },
                    ],
                },
            ],
            callback: async (action, context) => {
                const targetState = action.options.selectedState == 0 ? true : (action.options.selectedState == 1 ? false : !instance.isOn)
                instance.ws.send(
                    JSON.stringify({
                        "on": targetState
                    })
                )
            },
        },
        setSegState: {
            name: "Turn On / Turn Off / Toggle Segment",
            description: "Set the power state of a segment",
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
                        { id: 0, label: "Turn On" },
                        { id: 1, label: "Turn Off" },
                        { id: 2, label: "Toggle" },
                    ],
                },
            ],
            callback: async (action, context) => {
                if (action.options.selectedSegment <= instance.segmentCount) {
                    const targetState = action.options.selectedState == 0 ? true : (action.options.selectedState == 1 ? false : !instance.segments[action.options.selectedSegment].on)
                    var segObj = {};
                    segObj["id"] = action.options.selectedSegment;
                    segObj["on"] = targetState;
                    instance.ws.send(
                        JSON.stringify({
                            "seg": segObj
                        })
                    )
                }
            },
        },
        setBrightness: {
            name: "Set Brightness",
            description: "Set the brightness of the WLED controller",
            options: [
                {
                    type: 'number',
                    label: 'Brightness',
                    id: 'targetBrightness',
                    default: 127,
                    min: 0,
                    max: 255,
                },
            ],
            callback: async (action, context) => {
                var parsedBrightness = await instance.parseVariablesInString(action.options.targetBrightness);
                instance.ws.send(
                    JSON.stringify({
                        "bri": parsedBrightness
                    })
                )
            },
        },
        setSegBrightness: {
            name: "Set Segment Brightness",
            description: "Set the brightness of a segment",
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
                },
            ],
            callback: async (action, context) => {
                if (action.options.selectedSegment <= instance.segmentCount) {
                    var parsedBrightness = await instance.parseVariablesInString(action.options.targetBrightness);
                    var segObj = {};
                    segObj["id"] = action.options.selectedSegment;
                    segObj["bri"] = parsedBrightness;
                    instance.ws.send(
                        JSON.stringify({
                            "seg": segObj
                        })
                    )
                }
            },
        },
        setSegColor: {
            name: "Set Segment Color",
            description: "Set the color of a segment",
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
                    default: 128,
                    required: true
                },
                {
                    type: 'number',
                    label: 'Green (0-255)',
                    id: 'green',
                    min: 0,
                    max: 255,
                    default: 128,
                    required: true
                },
                {
                    type: 'number',
                    label: 'Blue (0-255)',
                    id: 'blue',
                    min: 0,
                    max: 255,
                    default: 128,
                    required: true
                },
            ],
            callback: async (action, context) => {
                if (action.options.selectedSegment <= instance.segmentCount) {
                    var segObj = {};
                    segObj["id"] = action.options.selectedSegment;
                    segObj["col"] = instance.segments[action.options.selectedSegment].col;
                    segObj["col"][0][0] = action.options.red;
                    segObj["col"][0][1] = action.options.green;
                    segObj["col"][0][2] = action.options.blue;
                    console.log(segObj.col[0]);
                    instance.ws.send(
                        JSON.stringify({
                            "seg": segObj
                        })
                    )
                }
            },
            learn: (action) => {
                return {
                    red: instance.segments[action.options.selectedSegment].col[0][0],
                    green: instance.segments[action.options.selectedSegment].col[0][1],
                    blue: instance.segments[action.options.selectedSegment].col[0][2],
                    selectedSegment: action.options.selectedSegment
                }
            },
        },
        setSegEffectParams: {
            name: "Set Segment Effect Parameter",
            description: "Set a effect parameter of a segment",
            options: [
                {
                    type: 'dropdown',
                    label: 'Parameter',
                    id: 'selectedParameter',
                    default: "sx",
                    choices: [
                        { id: "sx", label: "Speed" },
                        { id: "ix", label: "Intensity" },
                        { id: "c1", label: "Custom Slider 1" },
                        { id: "c2", label: "Custom Slider 2" },
                        { id: "c3", label: "Custom Slider 3" },
                    ],
                },
                {
                    type: 'dropdown',
                    label: 'Mode',
                    id: 'selectedMode',
                    default: 0,
                    choices: [
                        { id: "", label: "Set to value" },
                        { id: "~", label: "Increment by" },
                        { id: "~-", label: "Decrement by" },
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
                },
            ],
            callback: async (action, context) => {
                if (action.options.selectedSegment <= instance.segmentCount) {
                    var parsedValue = await instance.parseVariablesInString(action.options.targetParamValue);
                    var segObj = {};
                    segObj["id"] = action.options.selectedSegment;
                    segObj[action.options.selectedParameter] = action.options.selectedMode + parsedValue;
                    instance.ws.send(
                        JSON.stringify({
                            "seg": segObj
                        })
                    )
                }
            },
        },
        loadPreset: {
            name: "Load Preset",
            description: "Load a previously saved preset",
            options: [
                {
                    type: 'number',
                    label: 'Preset',
                    id: 'targetPreset',
                    default: 1,
                    min: 0,
                },
            ],
            callback: async (action, context) => {
                var parsedPreset = await instance.parseVariablesInString(action.options.targetPreset);
                instance.ws.send(
                    JSON.stringify({
                        "ps": parsedPreset
                    })
                )
            },
        },
    })
}