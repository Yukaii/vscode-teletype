import * as fs from 'fs';
import * as vscode from 'vscode';

import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';

interface Position {
  row: number;
  column: number;
}

interface TextUdpate {
  oldStart: Position;
  oldEnd: Position;
  newStart: Position;
  newEnd: Position;
  oldText: string;
  newText: string;
}

// Buffer is TextDocument in vscode
export default class BufferBinding {
  public readonly buffer : vscode.TextDocument;
  private editor : vscode.TextEditor;
  private readonly isHost : boolean;
  private bufferProxy : BufferProxy;
  public didDispose : Function;

  constructor ({buffer, isHost, didDispose}) {
    this.buffer = buffer;
    this.isHost = isHost;
    this.didDispose = didDispose;
  }

  dipose () {

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
    this.editor.edit(builder => {
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

  applyChanges (changes : vscode.TextDocumentContentChangeEvent[]) {
    changes.forEach(change => {
      const { start, end } = change.range;
      this.bufferProxy.setTextInRange(
        // oldStart
        { row: start.line, column: start.character },
        // oldEnd
        { row: end.line, column: end.character },
        change.text
      )
    })
  }

  save () {
  }
}
