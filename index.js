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

export const UpgradeScripts = upgradeScripts

export default class WLEDInstance extends InstanceBase {
	isInitialized = false

	async init(config) {
		this.config = config

		this.segmentCount = 0
		this.segments = []
		this.isOn = false
		this.lor = 0
		this.brightness = 0

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

		if (!this.config.targetIp) {
			this.updateStatus(InstanceStatus.BadConfig, `IP address is missing`)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		const ws = new WebSocket('ws://' + this.config.targetIp + '/ws')
		this.ws = ws

		ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)

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
			this.log('error', `WebSocket error: ${data}`)
		})
	}

	send(payload) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.log('warn', 'Not connected to WLED, command not sent')
			return
		}
		this.ws.send(JSON.stringify(payload))
	}

	parseWLEDState(data) {
		this.isOn = data.on
		this.lor = data.lor
		this.brightness = data.bri
		const segments = Array.isArray(data.seg) ? data.seg : []
		if (this.segmentCount != segments.length) {
			this.segmentCount = segments.length
			this.initActions()
			this.initFeedbacks()
			this.initVariables()
		}
		this.segments = segments
		this.checkAllFeedbacks()
	}

	parseWLEDInfo(data) {
		this.rgbw = data.leds?.rgbw
	}

	messageReceivedFromWebSocket(data) {
		let msgValue = null
		try {
			msgValue = JSON.parse(data)
		} catch (e) {
			return
		}
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
			const choice = {
				id: i,
				label: `Segment ${i + 1}`,
			}
			dropdownChoices.push(choice)
		}
		return dropdownChoices
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'targetIp',
				label: 'WLED IP address',
				width: 12,
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
				disableAutoExpression: true,
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
