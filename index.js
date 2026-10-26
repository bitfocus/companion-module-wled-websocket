import { InstanceBase, InstanceStatus } from '@companion-module/base'
import WebSocket from 'ws'
import { upgradeScripts } from './upgrade.js'
import { setupActions } from './actions.js'
import { setupFeedbacks } from './feedbacks.js'
import { setupVariables, parseWLEDVariables } from './variables.js'

// How often to ping WLED, and how many pings in a row may go unanswered before the connection
// is considered dead. Allowing a few misses keeps a brief Wi-Fi hiccup from dropping the connection.
const HEARTBEAT_INTERVAL = 5000
const HEARTBEAT_MAX_MISSED = 3
// Timeout for the HTTP requests that load effect, palette and preset names
const HTTP_TIMEOUT = 5000

export const UpgradeScripts = upgradeScripts

// The effect parameters in the order WLED's effect metadata lists their slider labels
const SLIDERS = [
	{ id: 'sx', name: 'Speed' },
	{ id: 'ix', name: 'Intensity' },
	{ id: 'c1', name: 'Custom 1' },
	{ id: 'c2', name: 'Custom 2' },
	{ id: 'c3', name: 'Custom 3' },
]

// Reads the slider labels from an effect's /json/fxdata entry, e.g. "!,Duty cycle;!,!;!;01".
// The first ";" section lists the labels: "!" means the default name, and an empty or missing
// label means the effect doesn't use that slider. Returns { sx: 'Speed', ix: 'Duty cycle', … }.
function parseEffectSliders(fxdata) {
	const labels = String(fxdata ?? '')
		.split(';')[0]
		.split(',')
	const sliders = {}
	SLIDERS.forEach((slider, i) => {
		const label = labels[i]?.trim()
		sliders[slider.id] = !label ? '' : label === '!' ? slider.name : label
	})
	return sliders
}

export default class WLEDInstance extends InstanceBase {
	isInitialized = false

	async init(config) {
		this.config = config

		this.segmentCount = 0
		this.segments = []
		this.isOn = false
		this.lor = 0
		this.brightness = 0
		this.state = null
		// Names loaded over HTTP, since the WebSocket API doesn't send them
		this.effects = []
		this.effectSliders = []
		this.palettes = []
		this.presets = {}
		this.playlists = new Set()
		this.presetsModified = undefined

		this.initActions()
		this.initFeedbacks()
		this.initVariables()

		this.isInitialized = true
		this.initWebSocket()
	}

	async destroy() {
		this.isInitialized = false
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		this.closeWebSocket()
	}

	async configUpdated(config) {
		this.config = config
		// The device may have changed, so reload the preset names on the next info message
		this.presetsModified = undefined
		this.initWebSocket()
	}

	maybeReconnect() {
		if (this.isInitialized && this.config.reconnect) {
			if (this.reconnect_timer) {
				clearTimeout(this.reconnect_timer)
			}
			this.reconnect_timer = setTimeout(() => {
				this.initWebSocket()
			}, 5000)
		}
	}

	// Stops the timers and closes the current socket without letting its events affect the instance
	closeWebSocket() {
		if (this.polling_timer) {
			clearInterval(this.polling_timer)
			this.polling_timer = null
		}
		if (this.heartbeat_timer) {
			clearInterval(this.heartbeat_timer)
			this.heartbeat_timer = null
		}
		if (this.ws) {
			this.ws.removeAllListeners()
			// Keep a no-op error listener so a late socket error can't crash the process
			this.ws.on('error', () => {})
			this.ws.terminate()
			delete this.ws
		}
	}

	initWebSocket() {
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		this.closeWebSocket()

		if (!this.getHost()) {
			this.updateStatus(InstanceStatus.BadConfig, `IP address is missing`)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		let ws
		try {
			ws = new WebSocket('ws://' + this.getHost() + '/ws')
		} catch (e) {
			this.updateStatus(InstanceStatus.BadConfig, `Invalid IP address: ${e.message}`)
			return
		}
		this.ws = ws

		ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.lastError = null
			this.loadEffectsAndPalettes()

			ws.missedPongs = 0
			this.heartbeat_timer = setInterval(() => {
				if (ws.missedPongs >= HEARTBEAT_MAX_MISSED) {
					this.log('warn', 'No response from WLED, closing connection')
					ws.terminate()
					return
				}
				ws.missedPongs++
				ws.ping()
			}, HEARTBEAT_INTERVAL)

			if (this.config.polling && this.config.interval > 0) {
				this.polling_timer = setInterval(() => {
					this.send({ v: true })
				}, this.config.interval)
			}
		})
		ws.on('pong', () => {
			ws.missedPongs = 0
		})
		ws.on('close', (code) => {
			this.closeWebSocket()
			this.updateStatus(InstanceStatus.Disconnected, `Connection closed with code ${code}`)
			this.maybeReconnect()
		})

		ws.on('message', this.messageReceivedFromWebSocket.bind(this))

		ws.on('error', (data) => {
			// While the device is offline every reconnect attempt fails the same way, so only log a
			// repeated error at debug level
			const message = `WebSocket error: ${data}`
			this.log(message === this.lastError ? 'debug' : 'error', message)
			this.lastError = message
		})
	}

	// The host (and optional port) of the WLED device: the discovered device if one is selected
	// (given as "ip:port"), otherwise the manually entered address without stray spaces or a
	// pasted http:// or ws:// prefix
	getHost() {
		if (this.config.bonjourHost) return this.config.bonjourHost
		return String(this.config.targetIp ?? '')
			.trim()
			.replace(/^(https?|wss?):\/\//i, '')
			.replace(/\/+$/, '')
	}

	send(payload) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.log('warn', 'Not connected to WLED, command not sent')
			return
		}
		this.ws.send(JSON.stringify(payload))
	}

	async fetchJson(path) {
		const response = await fetch(`http://${this.getHost()}${path}`, { signal: AbortSignal.timeout(HTTP_TIMEOUT) })
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		return response.json()
	}

	async loadEffectsAndPalettes() {
		try {
			const [effects, palettes, fxdata] = await Promise.all([
				this.fetchJson('/json/eff'),
				this.fetchJson('/json/pal'),
				this.fetchJson('/json/fxdata'),
			])
			this.effects = Array.isArray(effects) ? effects : []
			this.palettes = Array.isArray(palettes) ? palettes : []
			this.effectSliders = Array.isArray(fxdata) ? fxdata.map(parseEffectSliders) : []
			this.namesUpdated()
		} catch (e) {
			this.log('warn', `Could not load effect and palette names: ${e.message}`)
		}
	}

	async loadPresets() {
		try {
			const presets = await this.fetchJson('/presets.json')
			this.presets = {}
			this.playlists = new Set()
			for (const [id, preset] of Object.entries(presets ?? {})) {
				// Preset 0 is an internal placeholder, and unnamed slots are empty
				if (Number(id) > 0 && preset?.n) {
					this.presets[id] = preset.n
					// A preset with a playlist starts that playlist when it is loaded
					if (preset.playlist) this.playlists.add(Number(id))
				}
			}
			this.namesUpdated()
		} catch (e) {
			this.log('warn', `Could not load preset names: ${e.message}`)
		}
	}

	// Refresh everything that shows effect, palette or preset names
	namesUpdated() {
		this.initActions()
		this.initFeedbacks()
		if (this.state) {
			parseWLEDVariables(this, { state: this.state })
		}
		this.checkAllFeedbacks()
	}

	parseWLEDState(data) {
		this.state = data
		this.isOn = data.on
		this.lor = data.lor
		this.brightness = data.bri
		const segments = Array.isArray(data.seg) ? data.seg : []
		// Segment names appear in the Segment dropdowns, so rebuild them when a name changes too
		const segmentNames = segments.map((segment) => segment.n ?? '').join('\n')
		if (this.segmentCount != segments.length || this.segmentNames !== segmentNames) {
			this.segmentCount = segments.length
			this.segmentNames = segmentNames
			this.segments = segments
			this.initActions()
			this.initFeedbacks()
			this.initVariables()
		}
		this.segments = segments
		this.checkAllFeedbacks()
	}

	parseWLEDInfo(data) {
		// fs.pmt is the time the presets were last modified, so reload the names when it changes
		const presetsModified = data.fs?.pmt
		if (presetsModified !== this.presetsModified) {
			this.presetsModified = presetsModified
			this.loadPresets()
		}
	}

	messageReceivedFromWebSocket(data) {
		let msgValue = null
		try {
			msgValue = JSON.parse(data)
		} catch (e) {
			return
		}
		if (msgValue === null || typeof msgValue !== 'object') return
		if (msgValue.state != null) {
			this.parseWLEDState(msgValue.state)
		}
		if (msgValue.info != null) {
			this.parseWLEDInfo(msgValue.info)
		}
		parseWLEDVariables(this, msgValue)
	}

	// Returns the segment at the given index, or undefined if it doesn't exist (e.g. it was deleted on the device)
	getSegment(index) {
		const i = Number(index)
		return Number.isInteger(i) && i >= 0 && i < this.segments.length ? this.segments[i] : undefined
	}

	getSegmentChoices() {
		var dropdownChoices = []
		for (let i = 0; i < this.segmentCount; i++) {
			const name = this.segments[i]?.n
			const choice = {
				id: i,
				label: name ? `Segment ${i + 1}: ${name}` : `Segment ${i + 1}`,
			}
			dropdownChoices.push(choice)
		}
		return dropdownChoices
	}

	// The Segment option shared by every segment action and feedback
	getSegmentOption() {
		return {
			type: 'dropdown',
			label: 'Segment',
			id: 'selectedSegment',
			default: 0,
			choices: this.getSegmentChoices(),
			expressionDescription: 'The segment number counting from 0, so Segment 1 is 0',
		}
	}

	// Effects sorted by name, without WLED's reserved placeholder slots
	getEffectChoices() {
		return this.effects
			.map((name, id) => ({ id, label: name }))
			.filter((choice) => choice.label && choice.label !== 'RSVD')
			.sort((a, b) => a.label.localeCompare(b.label))
	}

	getPaletteChoices() {
		return this.palettes.map((name, id) => ({ id, label: name }))
	}

	getPresetChoices() {
		return Object.entries(this.presets)
			.map(([id, name]) => ({
				id: Number(id),
				label: this.playlists.has(Number(id)) ? `${id}: ${name} (playlist)` : `${id}: ${name}`,
			}))
			.sort((a, b) => a.id - b.id)
	}

	getPlaylistChoices() {
		return this.getPresetChoices().filter((choice) => this.playlists.has(choice.id))
	}

	getConfigFields() {
		return [
			{
				type: 'bonjour-device',
				id: 'bonjourHost',
				label: 'WLED device',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'targetIp',
				label: 'WLED IP address',
				width: 6,
				isVisibleExpression: '!$(options:bonjourHost)',
			},
			{
				type: 'checkbox',
				id: 'reconnect',
				label: 'Reconnect',
				tooltip: 'Reconnect on WebSocket error (after 5 secs)',
				width: 6,
				default: true,
			},
			{
				type: 'checkbox',
				id: 'polling',
				label: 'Poll for updates',
				width: 6,
				default: false,
			},
			{
				type: 'number',
				id: 'interval',
				label: 'Polling interval (ms)',
				width: 6,
				default: 1000,
				min: 100,
				max: 60000,
				isVisibleExpression: '$(options:polling)',
			},
		]
	}

	initFeedbacks() {
		setupFeedbacks(this)
	}

	initActions() {
		setupActions(this)
	}

	initVariables() {
		setupVariables(this)
	}
}
