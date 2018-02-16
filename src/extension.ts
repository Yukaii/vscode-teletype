'use strict';
import * as vscode from 'vscode';
const path = require('path');

//#region Inject global dependencies
import * as fetch from 'node-fetch';
const rtc = require('electron-webrtc-patched')();

// TODO: remove this, this is only for prototyping
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const globalAny : any = global;
globalAny.window = {}
globalAny.window = global
globalAny.window.fetch = fetch
globalAny.RTCIceCandidate = rtc.RTCIceCandidate
globalAny.RTCPeerConnection = rtc.RTCPeerConnection
globalAny.RTCSessionDescription = rtc.RTCSessionDescription
//#endregion

import {TeletypeClient, Errors} from '@atom/teletype-client';
import GuestPortalBinding from './GuestPortalBinding';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('teletype.join-portal', async () => {
		const portalId = await vscode.window.showInputBox({prompt: 'Enter portal ID'})
		// TODO: simple validation portal ID
		await joinPortal(portalId);
	});

	context.subscriptions.push(disposable);
}

async function joinPortal (portalId) {

	const client = new TeletypeClient({
		pusherKey: 'f119821248b7429bece3',
		pusherOptions: {
			cluster: 'mt1'
		},
		baseURL: 'https://api.teletype.atom.io'
	});

	client.onConnectionError = (event) => {
		throw(`Connection Error: An error occurred with a teletype connection: ${event.message}`);
	}

	await client.initialize();

	// manually signin
	// TODO: Remove this
	await client.signIn(process.env.AUTH_TOKEN)

	const portalBinding = new GuestPortalBinding({
		portalId,
		client,
		editor: vscode.window.activeTextEditor
	});
	await portalBinding.initialize()
}

// this method is called when your extension is deactivated
export function deactivate() {
}
