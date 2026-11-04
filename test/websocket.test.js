import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { once } from 'node:events'
import { test } from 'node:test'
import vm from 'node:vm'
import * as base from '@companion-module/base'
import WebSocket from 'ws'

// Capture the entrypoint without starting the host IPC process. All local module
// files and the WebSocket implementation execute unchanged.
async function loadInstance() {
	let Instance
	class TestBase {
		setActionDefinitions(actions) {
			this.actions = actions
		}
		setFeedbackDefinitions(feedbacks) {
			this.feedbacks = feedbacks
		}
		updateStatus(status) {
			this.status = status
		}
		checkFeedbacks() {
			this.feedbackChecks = (this.feedbackChecks || 0) + 1
		}
		log() {}
		async parseVariablesInString(value) {
			return value
		}
	}
	const context = vm.createContext({ console, setTimeout, clearTimeout })
	const modules = new Map()
	const synthetic = (name, exports) =>
		new vm.SyntheticModule(
			Object.keys(exports),
			function () {
				for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
			},
			{ context, identifier: name },
		)
	modules.set(
		'@companion-module/base',
		synthetic('base', {
			...base,
			InstanceBase: TestBase,
			runEntrypoint: (value) => {
				Instance = value
			},
		}),
	)
	modules.set('ws', synthetic('ws', { default: WebSocket }))
	async function load(url) {
		if (modules.has(url)) return modules.get(url)
		const module = new vm.SourceTextModule(await readFile(new URL(url), 'utf8'), { context, identifier: url })
		modules.set(url, module)
		await module.link((specifier, parent) => modules.get(specifier) || load(new URL(specifier, parent.identifier).href))
		return module
	}
	const entry = await load(new URL('../index.js', import.meta.url).href)
	await entry.evaluate()
	return new Instance()
}

async function waitFor(predicate) {
	for (let count = 0; count < 100; count++) {
		if (predicate()) return
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
	assert.fail('Timed out waiting for module state')
}

test('WLED state, actions, feedbacks, config reload and teardown over WebSocket', { timeout: 10000 }, async (t) => {
	const server = new WebSocket.Server({ host: '127.0.0.1', port: 0 })
	await once(server, 'listening')
	const instance = await loadInstance()
	t.after(async () => {
		await instance.destroy()
		for (const socket of server.clients) socket.terminate()
		await new Promise((resolve) => server.close(resolve))
	})
	const connected = once(server, 'connection')
	const config = { targetIp: `127.0.0.1:${server.address().port}`, reconnect: false }
	await instance.init(config)
	const [socket, request] = await connected
	assert.equal(request.url, '/ws')
	await waitFor(() => instance.status === base.InstanceStatus.Ok)
	socket.send(
		JSON.stringify({
			state: { on: true, bri: 91, seg: [{ on: true, bri: 63, col: [[1, 2, 3]], sx: 45 }] },
			info: { leds: { rgbw: true } },
		}),
	)
	await waitFor(() => instance.feedbackChecks > 0)
	assert.equal(instance.rgbw, true)
	assert.equal(instance.feedbacks.powerState.callback({ options: {} }), true)
	assert.equal(instance.feedbacks.segBrightness.callback({ options: { selectedSegment: 0 } }).text, 63)
	assert.equal(
		instance.feedbacks.segColor.callback({ options: { selectedSegment: 0 } }).bgcolor,
		base.combineRgb(1, 2, 3),
	)
	assert.equal(instance.actions.setSegState.options[0].choices.length, 1)
	for (const [id, options, expected] of [
		['setState', { selectedState: 2 }, { on: false }],
		['setSegState', { selectedSegment: 0, selectedState: 2 }, { seg: { id: 0, on: false } }],
		['setBrightness', { targetBrightness: 127 }, { bri: 127 }],
		[
			'setSegEffectParams',
			{ selectedSegment: 0, selectedParameter: 'sx', selectedMode: '~', targetParamValue: 10 },
			{ seg: { id: 0, sx: '~10' } },
		],
		['loadPreset', { targetPreset: 3 }, { ps: 3 }],
	]) {
		const received = once(socket, 'message')
		await instance.actions[id].callback({ options }, {})
		assert.deepEqual(JSON.parse((await received)[0].toString()), expected)
	}
	const reconnected = once(server, 'connection')
	await instance.configUpdated(config)
	const [replacement] = await reconnected
	await waitFor(() => instance.ws.readyState === WebSocket.OPEN)
	const closed = once(replacement, 'close')
	await instance.destroy()
	await closed
	assert.equal(instance.isInitialized, false)
	assert.equal(instance.ws, undefined)
	assert.equal(instance.reconnect_timer, undefined)
})
