import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import WebSocket from 'ws'
import { upgradeScripts } from './upgrade.js'
import { setupActions } from './actions.js'
import { setupFeedbacks } from './feedbacks.js'
import { setupVariables, parseWLEDVariables } from './variables.js'

class WLEDInstance extends InstanceBase {
	isInitialized = false

	async init(config) {
		this.config = config

		this.initWebSocket()
		this.isInitialized = true

		this.segmentCount = 0
		this.segments = []
		this.isOn = false
		this.brightness = 0

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
	}

	async destroy() {
		this.isInitialized = false
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		if (this.polling_timer) {
			clearInterval(this.polling_timer)
			this.polling_timer = null
		}

		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
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

	initWebSocket() {
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		if (this.polling_timer) {
			clearInterval(this.polling_timer)
			this.polling_timer = null
		}

		const url = 'ws://' + this.config.targetIp + '/ws'
		if (!url || !this.config.targetIp) {
			this.updateStatus(InstanceStatus.BadConfig, `IP address is missing`)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
		this.ws = new WebSocket(url)

		this.ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			if (this.config.polling && this.config.interval > 0) {
				this.polling_timer = setInterval(() => {
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send('{"v":true}')
					}
				}, this.config.interval)
			}
		})
		this.ws.on('close', (code) => {
			this.updateStatus(InstanceStatus.Disconnected, `Connection closed with code ${code}`)
			this.maybeReconnect()
		})

		this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

		this.ws.on('error', (data) => {
			this.log('error', `WebSocket error: ${data}`)
		})
	}

	parseWLEDState(data) {
		this.isOn = data.on
		this.brightness = data.bri
		if (this.segmentCount != data.seg.length) {
			this.segmentCount = data.seg.length
			this.initActions()
			this.initFeedbacks()
			this.initVariables()
		}
		this.segments = data.seg
		this.checkFeedbacks()
	}

	parseWLEDInfo(data) {
		this.rgbw = data.leds.rgbw
	}

	messageReceivedFromWebSocket(data) {
		let msgValue = null
		try {
			msgValue = JSON.parse(data)
		} catch (e) {
			msgValue = data
		}
		if (msgValue.state != null) {
			this.parseWLEDState(msgValue.state)
		}
		if (msgValue.info != null) {
			this.parseWLEDInfo(msgValue.info)
		}
		parseWLEDVariables(this, msgValue)
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
			},
			{
				type: 'number',
				id: 'interval',
				label: 'Polling interval (ms)',
				width: 6,
				default: 1000,
				min: 100,
				max: 60000,
				isVisible: (config) => config.polling,
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

runEntrypoint(WLEDInstance, upgradeScripts)
