import * as vscode from 'vscode';
import Portal from '@atom/teletype-client/lib/portal';
import EditorProxy from '@atom/teletype-client/lib/editor-proxy';

import { SelectionMap, Selection, Position } from './teletype_types';

export default class EditorBinding {
	public readonly editor : vscode.TextEditor;

	private portal : Portal;
	private readonly isHost : boolean;
	private editorProxy : EditorProxy;
	private localSelectionMap : SelectionMap;

	private preserveFollowState;
	private positionsBySiteId;

	constructor ({editor, portal, isHost}) {
		this.editor = editor
		this.portal = portal
		this.isHost = isHost

		this.preserveFollowState = false
		this.localSelectionMap = {};
		this.positionsBySiteId = {};
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

	updateSelections (selections : vscode.Selection[]) {
		this.convertSelections(selections);
		this.editorProxy.updateSelections(this.localSelectionMap)
	}

	/**
	 * Convert vscode selections to meet teletype selection
	 * @param selections
	 */
	private convertSelections(selections : vscode.Selection[]) {
		const currentSelectionKeys = Object.keys(this.localSelectionMap)
		const newSelectionsLength = selections.length

		// set new selections
		selections.forEach((selection, index) => {
			this.localSelectionMap[index] = {
				range: {
					start: this.convertPosition(selection.start),
					end: this.convertPosition(selection.end)
				},
				reversed: selection.isReversed,
			}
		})

		// unset old selections
		if (currentSelectionKeys.length > newSelectionsLength) {
			for (let index = newSelectionsLength; index < currentSelectionKeys.length; index += 1) {
				this.localSelectionMap[index] = null;
			}
		}
	}

	private convertPosition (pos : vscode.Position) : Position {
		return {
			column: pos.character,
			row: pos.line
		};
	}
}
