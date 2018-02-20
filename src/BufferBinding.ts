import * as fs from 'fs';
import * as vscode from 'vscode';

import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';
import * as PQueue from 'p-queue';

import { Position, TextUdpate } from './teletype_types';

// Buffer is TextDocument in vscode
export default class BufferBinding {
	public readonly buffer : vscode.TextDocument;
	private editor : vscode.TextEditor;
	private readonly isHost : boolean;
	private bufferProxy : BufferProxy;
	public didDispose : Function;
	private updatingText : boolean;
	private editsQueue : PQueue;
	private updateTextSync : Function;

	constructor ({buffer, isHost, didDispose}) {
		this.buffer = buffer;
		this.isHost = isHost;
		this.didDispose = didDispose;
		this.updatingText = false;
		this.editsQueue = new PQueue({concurrency: 1});
	}

	dispose () {
		// TODO:
	}

	setBufferProxy (bufferProxy : BufferProxy) {
		this.bufferProxy = bufferProxy
	}

	/**
	 * Set text value of the buffer
	 * Will only be called once after `bufferProxy.setDelegate(bufferBinding)`
	 */
	setText (text : string) {
		fs.writeFileSync(this.buffer.uri.fsPath, text)
	}

	setEditor (editor : vscode.TextEditor) {
		this.editor = editor;
	}

	updateText (textUpdates: TextUdpate[]) {
		return this.editor.edit(builder => {
			for (let i = textUpdates.length - 1; i >= 0; i--) {
				const {oldStart, oldEnd, newText} = textUpdates[i]
				builder.replace(this.createRange(oldStart, oldEnd), newText)
			}
		}, { undoStopBefore: false, undoStopAfter: true })
	}

	private createRange (start : Position, end : Position) : vscode.Range {
		return new vscode.Range(
			new vscode.Position(start.row, start.column),
			new vscode.Position(end.row, end.column)
		)
	}

	onDidChangeBuffer (changes : vscode.TextDocumentContentChangeEvent[]) {
		this.bufferProxy.onDidChangeBuffer(changes.map(change => {
			const { start, end } = change.range;

			return {
				oldStart: { row: start.line, column: start.character },
				oldEnd: { row: end.line, column: end.character },
				newText: change.text
			}
		}))
	}

	private updateTextPromise (textUpdates: TextUdpate[]) {
		console.log('apply edits from builder')
		return this.editor.edit(builder => {
			for (let i = textUpdates.length - 1; i >= 0; i--) {
				const {oldStart, oldEnd, newText} = textUpdates[i]
				builder.replace(this.createRange(oldStart, oldEnd), newText)
			}
		})
	}

	requestSavePromise () {
		// never ending promise? 🎶
		// FIXME: should patch TextDocument save event
		// Guest cannot save document
		return new Promise(() => {
			this.bufferProxy.requestSave()
		})
	}

	save () {
		// NOTE: guest will not recieve save event
		this.buffer.save()
	}
}
