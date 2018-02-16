import * as vscode from 'vscode';
import Portal from '@atom/teletype-client/lib/portal';
import EditorProxy from '@atom/teletype-client/lib/editor-proxy';

export default class EditorBinding {
	public readonly editor : vscode.TextEditor;

	private portal : Portal;
	private readonly isHost : boolean;
	private editorProxy : EditorProxy;

	private markerLayersBySiteId;
	private markersByLayerAndId;
	private preserveFollowState;
	private positionsBySiteId;

	constructor ({editor, portal, isHost}) {
		this.editor = editor
		this.portal = portal
		this.isHost = isHost

		this.markerLayersBySiteId = new Map()
		this.markersByLayerAndId = new WeakMap()
		this.preserveFollowState = false
		this.positionsBySiteId = {}
	}

	onDidDispose (onDidDipose) {
		// TODO: bind depose callback
		this.onDidDispose = onDidDipose
	}

	setEditorProxy (editorProxy : EditorProxy) {
		this.editorProxy = editorProxy
	}

	updateSelectionsForSiteId (siteId, selections) {

	}

	isScrollNeededToViewPosition (position) {

	}

	updateTether (state, position) {
	}

	clearSelectionsForSiteId (siteId) {
	}
}
