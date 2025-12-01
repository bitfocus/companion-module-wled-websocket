## WLED WebSocket

This module enables Companion to control a WLED instance using a websocket connection.

### Setup

Simply type in the IP of the WLED controller in the module configuration and you are ready to go. If you want to control more than one WLED controller, simply add this module several times to your companion instance.

### Supported actions

- Turn On / Turn Off / Toggle the whole WLED device
- Turn On / Turn Off / Toggle individual segments
- Set the brightness for the whole WLED device
- Set the brightness for individual segments
- Set effect parameters for individual segments
- Set the color for individual segments

### Supported feedbacks

- Get the power state for the whole WLED device
- Get the power state for individual segments
- Get the brightness for the whole WLED device
- Get the brightness for individual segments
- Get the effect parameters for individual segments
- Get the color for individual segments

### Supported variables

- `$(wled-websocket:power)` - Global Power
- `$(wled-websocket:brightness)` - Global Brightness
- `$(wled-websocket:preset)` - Current Preset
- `$(wled-websocket:version)` - WLED Version
- `$(wled-websocket:processor)` - WLED Processor
- `$(wled-websocket:led_count)` - LED Count
- `$(wled-websocket:current)` - Current (mA)
- `$(wled-websocket:max_current)` - Max Current (mA)
- `$(wled-websocket:name)` - WLED Name
- `$(wled-websocket:free_heap)` - Free Heap
- `$(wled-websocket:uptime)` - Uptime
- `$(wled-websocket:ip_address)` - IP Address

#### Segment Variables

For each segment (replace X with segment number, starting at 1):

- `$(wled-websocket:segment_X_power)` - Segment X Power
- `$(wled-websocket:segment_X_brightness)` - Segment X Brightness
- `$(wled-websocket:segment_X_color)` - Segment X Color
- `$(wled-websocket:segment_X_effect)` - Segment X Effect
- `$(wled-websocket:segment_X_effect_speed)` - Segment X Effect Speed
- `$(wled-websocket:segment_X_effect_intensity)` - Segment X Effect Intensity
- `$(wled-websocket:segment_X_effect_custom_1)` - Segment X Effect Custom Slider 1
- `$(wled-websocket:segment_X_effect_custom_2)` - Segment X Effect Custom Slider 2
- `$(wled-websocket:segment_X_effect_custom_3)` - Segment X Effect Custom Slider 3
