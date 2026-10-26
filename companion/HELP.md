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
- Set the effect for individual segments, chosen by name (or entered by number)
- Set the color palette for individual segments, chosen by name (or entered by number)
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

### Ready-made buttons

The Presets tab has ready-made buttons for this connection:

- **Power & Brightness**: power toggle, a brightness dial (turn to dim, press to toggle power) and 25/50/75/100% buttons
- **Presets & Playlists**: one button per preset saved on the WLED, plus next/previous preset, playlist next/stop and a night light toggle
- **Segments**: power, brightness dial and freeze buttons for each segment, labelled with the segment's name
- **Effects**: a set of common effects, and speed/intensity dials labelled with what the current effect calls them
- **Colors** and **Device** (live data override, sync send)

The preset and segment buttons follow the WLED: when you save, rename or delete a preset, or change the segments, the list updates. A button you already placed for a preset that was later deleted keeps working as a button, but its label shows `$NA` until you remove it or point it at another preset.

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

The examples use `wled`, the default connection label; if you gave the connection another label, use that instead.

- `$(wled:power)` - Global Power
- `$(wled:brightness)` - Global Brightness
- `$(wled:preset)` - Current Preset
- `$(wled:preset_name)` - Current Preset Name
- `$(wled:preset_N_name)` - Name of saved preset N (e.g. `$(wled:preset_3_name)`)
- `$(wled:playlist)` / `$(wled:playlist_name)` - Running playlist and its name (`none` when no playlist is running)
- `$(wled:transition)` - Transition time in seconds
- `$(wled:nightlight)` - Whether the night light is on
- `$(wled:sync_send)` / `$(wled:sync_receive)` - Whether sync sending / receiving is on
- `$(wled:nightlight_remaining)` - Seconds left on the night light. WLED only reports this when something changes, so turn on **Poll for updates** to keep it counting down
- `$(wled:version)` - WLED Version
- `$(wled:processor)` - WLED Processor (chip model, e.g. ESP32-D0WD-V3)
- `$(wled:led_count)` - LED Count
- `$(wled:current)` - Current (mA)
- `$(wled:max_current)` - Max Current (mA)
- `$(wled:name)` - WLED Name
- `$(wled:free_heap)` - Free Heap
- `$(wled:uptime)` - Uptime
- `$(wled:ip_address)` - IP Address

#### Segment Variables

For each segment (replace X with segment number, starting at 1):

- `$(wled:segment_X_name)` - Segment X Name (its WLED name, or "Segment X")
- `$(wled:segment_X_power)` - Segment X Power
- `$(wled:segment_X_brightness)` - Segment X Brightness
- `$(wled:segment_X_color)` - Segment X Color (primary color as #RRGGBB)
- `$(wled:segment_X_cct)` - Segment X Color Temperature (0 = warm, 255 = cold)
- `$(wled:segment_X_freeze)`, `…_reverse`, `…_mirror` - Segment X options
- `$(wled:segment_X_effect)` - Segment X Effect
- `$(wled:segment_X_effect_name)` - Segment X Effect Name
- `$(wled:segment_X_palette)` - Segment X Palette
- `$(wled:segment_X_palette_name)` - Segment X Palette Name
- `$(wled:segment_X_effect_speed)` - Segment X Effect Speed
- `$(wled:segment_X_effect_intensity)` - Segment X Effect Intensity
- `$(wled:segment_X_effect_custom_1)` - Segment X Effect Custom Slider 1
- `$(wled:segment_X_effect_custom_2)` - Segment X Effect Custom Slider 2
- `$(wled:segment_X_effect_custom_3)` - Segment X Effect Custom Slider 3
- `$(wled:segment_X_speed_label)`, `…_intensity_label`, `…_custom_1_label`, `…_custom_2_label`, `…_custom_3_label` - What the current effect calls each slider (for example "Duty cycle"); empty when the effect doesn't use that slider
