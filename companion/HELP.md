## WLED WebSocket

This module enables Companion to control a WLED instance using a websocket connection.

### Setup

Requires Companion 4.3 or later.

Pick your WLED controller from the **WLED device** list, which shows WLED controllers discovered on the network, or choose **Manual** and type in its IP address. If you want to control more than one WLED controller, simply add this module several times to your companion instance.

### Supported actions

- Turn On / Turn Off / Toggle the whole WLED device
- Turn On / Turn Off / Toggle individual segments
- Set, increase or decrease the brightness for the whole WLED device
- Set, increase or decrease the brightness for individual segments
- Set the effect for individual segments, chosen by name
- Set the color palette for individual segments, chosen by name
- Set effect parameters for individual segments
- Set the primary, secondary or tertiary color for individual segments, including the white channel on RGBW strips
- Control live data override
- Load a preset, chosen by name (or entered by number). Loading a playlist's preset starts the playlist
- Step to the next or previous saved preset in a range (empty preset slots are skipped), or pick a random one
- Skip to the next entry of the running playlist, or stop it
- Set the transition time, permanently or for the next change only
- Turn the night light on, off or toggle it, with its duration, mode and target brightness
- Turn a segment's freeze, reverse or mirror option on, off or toggle it
- Set a segment's white color temperature, on strips with tunable white (CCT)
- Turn sending sync changes to other WLED devices on, off or toggle it
- Reboot the WLED controller

Segments are listed by their WLED name when they have one. When you use an expression for a Segment option, the first segment is 0.

Increasing and decreasing brightness stops at 1 so the lights stay on, unless "Allow dimming to off" is checked. On a rotary encoder, use Increase on the right turn and Decrease on the left turn.

Effect, palette and preset names are loaded from the WLED over HTTP when the module connects. Preset names reload automatically when presets are saved on the WLED.

### Supported feedbacks

- Get the power state for the whole WLED device
- Get the power state for individual segments
- Get the brightness for the whole WLED device
- Get the brightness for individual segments
- Get the effect parameters for individual segments
- Get the color for individual segments
- Whether a segment is running a given effect
- Whether a given preset is active
- Whether a playlist (any, or a given one) is running
- Whether the night light is on
- Whether a segment's freeze, reverse or mirror option is on
- Whether sync sending or receiving is on
- Whether live data override is enabled

### Supported variables

- `$(wled-websocket:power)` - Global Power
- `$(wled-websocket:brightness)` - Global Brightness
- `$(wled-websocket:preset)` - Current Preset
- `$(wled-websocket:preset_name)` - Current Preset Name
- `$(wled-websocket:playlist)` / `$(wled-websocket:playlist_name)` - Running playlist and its name (`none` when no playlist is running)
- `$(wled-websocket:transition)` - Transition time in seconds
- `$(wled-websocket:nightlight)` - Whether the night light is on
- `$(wled-websocket:sync_send)` / `$(wled-websocket:sync_receive)` - Whether sync sending / receiving is on
- `$(wled-websocket:nightlight_remaining)` - Seconds left on the night light. WLED only reports this when something changes, so turn on **Poll for updates** to keep it counting down
- `$(wled-websocket:version)` - WLED Version
- `$(wled-websocket:processor)` - WLED Processor (chip model, e.g. ESP32-D0WD-V3)
- `$(wled-websocket:led_count)` - LED Count
- `$(wled-websocket:current)` - Current (mA)
- `$(wled-websocket:max_current)` - Max Current (mA)
- `$(wled-websocket:name)` - WLED Name
- `$(wled-websocket:free_heap)` - Free Heap
- `$(wled-websocket:uptime)` - Uptime
- `$(wled-websocket:ip_address)` - IP Address

#### Segment Variables

For each segment (replace X with segment number, starting at 1):

- `$(wled-websocket:segment_X_name)` - Segment X Name (its WLED name, or "Segment X")
- `$(wled-websocket:segment_X_power)` - Segment X Power
- `$(wled-websocket:segment_X_brightness)` - Segment X Brightness
- `$(wled-websocket:segment_X_color)` - Segment X Color (primary color as #RRGGBB)
- `$(wled-websocket:segment_X_cct)` - Segment X Color Temperature (0 = warm, 255 = cold)
- `$(wled-websocket:segment_X_freeze)`, `…_reverse`, `…_mirror` - Segment X options
- `$(wled-websocket:segment_X_effect)` - Segment X Effect
- `$(wled-websocket:segment_X_effect_name)` - Segment X Effect Name
- `$(wled-websocket:segment_X_palette)` - Segment X Palette
- `$(wled-websocket:segment_X_palette_name)` - Segment X Palette Name
- `$(wled-websocket:segment_X_effect_speed)` - Segment X Effect Speed
- `$(wled-websocket:segment_X_effect_intensity)` - Segment X Effect Intensity
- `$(wled-websocket:segment_X_effect_custom_1)` - Segment X Effect Custom Slider 1
- `$(wled-websocket:segment_X_effect_custom_2)` - Segment X Effect Custom Slider 2
- `$(wled-websocket:segment_X_effect_custom_3)` - Segment X Effect Custom Slider 3
- `$(wled-websocket:segment_X_speed_label)`, `…_intensity_label`, `…_custom_1_label`, `…_custom_2_label`, `…_custom_3_label` - What the current effect calls each slider (for example "Duty cycle"); empty when the effect doesn't use that slider
