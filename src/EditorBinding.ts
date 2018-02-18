import * as vscode from 'vscode';
import Portal from '@atom/teletype-client/lib/portal';
import EditorProxy from '@atom/teletype-client/lib/editor-proxy';

import { SelectionMap, Selection, Position, Range } from './teletype_types';

const NullDecoration = vscode.window.createTextEditorDecorationType({
})

export default class EditorBinding {
	public readonly editor : vscode.TextEditor;

	private portal : Portal;
	private readonly isHost : boolean;
	private editorProxy : EditorProxy;
	private localSelectionMap : SelectionMap;
	private selectionRangesBySiteId : Map<number, Map<number, vscode.Range>>;
	private selectionDecorationByMarkerId : Map<number, vscode.TextEditorDecorationType>;

	private preserveFollowState;
	private positionsBySiteId;

	constructor ({editor, portal, isHost}) {
		this.editor = editor
		this.portal = portal
		this.isHost = isHost

		this.preserveFollowState = false
		this.localSelectionMap = {};
		this.positionsBySiteId = {};
		this.selectionRangesBySiteId = new Map();
		this.selectionDecorationByMarkerId = new Map();
	}

	dispose () {
		// TODO:
	}

	onDidDispose (onDidDipose) {
		// TODO: bind depose callback
		this.onDidDispose = onDidDipose
	}

	setEditorProxy (editorProxy : EditorProxy) {
		this.editorProxy = editorProxy
	}

	updateSelectionsForSiteId (siteId : number, selections : SelectionMap) {
		let markerIdRangeMap : Map<number, vscode.Range>;
		let clearRanges : vscode.Range[] = [];

		Object.keys(selections).forEach(markerId => {
			markerIdRangeMap = this.findOrCreateMarkRangeMapFromSiteId(siteId);
			const markerUpdate = selections[markerId];
			const markerIdInt = parseInt(markerId);
			const decorationType = this.findOrCreateSelectionDecorationFromMarkerId(markerIdInt)
			const oldRange = markerIdRangeMap.get(markerIdInt);

			if (markerUpdate) {
				const range = this.convertTeletypeRange(markerUpdate.range)
				markerIdRangeMap.set(markerIdInt, range);
				this.selectionRangesBySiteId.set(siteId, markerIdRangeMap);

				if (oldRange) {
					this.editor.setDecorations(NullDecoration, [oldRange]);
				}

				this.editor.setDecorations(decorationType, [range]);
			} else { // selection clearance
				this.selectionDecorationByMarkerId.delete(markerIdInt)
				clearRanges = clearRanges.concat(oldRange)
			}
		});
		clearRanges = clearRanges.filter(r => r)

		if (clearRanges.length > 0) {
			this.editor.setDecorations(NullDecoration, clearRanges);
		}
	}

	isScrollNeededToViewPosition (position) {

	}

	updateTether (state, position) {
	}

	/**
	 * Clear site selections when site did leave portal
	 */
	clearSelectionsForSiteId (siteId) {
		const markerIdRangeMap = this.findOrCreateMarkRangeMapFromSiteId(siteId)
		const ranges = Array.from(markerIdRangeMap.values())

		if (ranges.length > 0) {
			this.editor.setDecorations(NullDecoration, ranges)
		}
	}

	updateSelections (selections : vscode.Selection[]) {
		this.processSelections(selections);
		this.editorProxy.updateSelections(this.localSelectionMap)
	}

	/**
	 * Convert vscode selections to meet teletype selection
	 * @param selections
	 */
	private processSelections(selections : vscode.Selection[]) {
		const currentSelectionKeys = Object.keys(this.localSelectionMap)
		const newSelectionsLength = selections.length

		// set new selections
		selections.forEach((selection, index) => {
			this.localSelectionMap[index] = {
				range: {
					start: this.convertVSCodePosition(selection.start),
					end: this.convertVSCodePosition(selection.end)
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

	private convertVSCodePosition (position : vscode.Position) : Position {
		return {
			column: position.character,
			row: position.line
		};
	}

	private convertTeletypePosition (position : Position) : vscode.Position {
		return new vscode.Position(
			position.row,
			position.column
		)
	}

	private convertTeletypeRange (range : Range) : vscode.Range {
		return new vscode.Range(
			this.convertTeletypePosition(range.start),
			this.convertTeletypePosition(range.end)
		)
	}

	private findOrCreateSelectionDecorationFromMarkerId (markerId : number) : vscode.TextEditorDecorationType {
		// TODO: get each site's color from map
		let decoration = this.selectionDecorationByMarkerId.get(markerId);
		if (!decoration) {
			decoration = vscode.window.createTextEditorDecorationType({
				backgroundColor: `rgba(123, 0, 0, 0.5)`
			})
			this.selectionDecorationByMarkerId.set(markerId, decoration)
		}
		return decoration
	}

	private findOrCreateMarkRangeMapFromSiteId (siteId) : Map<number, vscode.Range> {
		let markerIdRangeMap = this.selectionRangesBySiteId.get(siteId)
		if (!markerIdRangeMap) {
			markerIdRangeMap = new Map();
			this.selectionRangesBySiteId.set(siteId, markerIdRangeMap);
		}

		return markerIdRangeMap;
	}
}
