import * as fs from 'fs';
import * as vscode from 'vscode';

import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';

// Buffer is TextDocument in vscode
export default class BufferBinding {
  private readonly buffer : vscode.TextDocument;
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

  setBufferProxy (bufferProxy) {
    this.bufferProxy = bufferProxy
  }

  setText (text) {
    fs.writeFileSync(this.buffer.uri.fsPath, text)
  }

  updateText (textUpdates) {
    console.log(textUpdates)
  }

  save () {
  }
}
