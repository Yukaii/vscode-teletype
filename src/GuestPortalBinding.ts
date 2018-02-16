import * as vscode from 'vscode';
import {TeletypeClient, Errors, FollowState} from '@atom/teletype-client';
import Portal from '@atom/teletype-client/lib/portal';
import EditorProxy from '@atom/teletype-client/lib/editor-proxy';
import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';

import BufferBinding from './BufferBinding';
import EditorBinding from './EditorBinding';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export default class GuestPortalBinding {
  public client : TeletypeClient;
  private readonly portalId : string;
  private readonly editor : vscode.TextEditor;
  private portal : Portal;
  private lastEditorProxyChangePromise : Promise<void>;
  private editorBindingsByEditorProxy;
  private bufferBindingsByBufferProxy;
  private editorProxiesByEditor;

  constructor({ client, portalId, editor }) {
    this.client = client;
    this.portalId = portalId;
    this.editor = editor;
    this.lastEditorProxyChangePromise = Promise.resolve()
    this.editorBindingsByEditorProxy = new Map()
    this.bufferBindingsByBufferProxy = new Map()
    this.editorProxiesByEditor = new WeakMap()
  }

  async initialize () {
    this.portal = await this.client.joinPortal(this.portalId)
    await this.portal.setDelegate(this)
  }

  siteDidJoin (siteId) {
    const {login: hostLogin} = this.portal.getSiteIdentity(1);
    const {login: siteLogin} = this.portal.getSiteIdentity(siteId);

    vscode.window.showInformationMessage(`@${siteLogin} has joined @${hostLogin}'s portal`)
  }

  siteDidLeave (siteId) {
    const {login: hostLogin} = this.portal.getSiteIdentity(1)
    const {login: siteLogin} = this.portal.getSiteIdentity(siteId)

    vscode.window.showInformationMessage(`@${siteLogin} has left @${hostLogin}'s portal`)
  }

  addEditorProxy (editorProxy) {
    // throw('Not implemented yet')
  }

  removeEditorProxy (editorProxy) {
    throw('Not implemented yet')
  }

  updateActivePositions (positionsBySiteId) {
    throw('Not implemented yet')
  }

  hostDidClosePortal () {
    throw('Not implemented yet')
  }

  hostDidLoseConnection () {
    throw('Not implemented yet')
  }

  updateTether (followState, editorProxy, position) {
    if (editorProxy) {
      this.lastEditorProxyChangePromise = this.lastEditorProxyChangePromise.then(() =>
        this._updateTether(followState, editorProxy, position)
      )
    }

    return this.lastEditorProxyChangePromise
  }

  dispose () {
    throw('Not implemented yet')
  }

  private async _updateTether (followState, editorProxy, position) {
    if (followState === FollowState.RETRACTED) {
      const editor = await this.findOrCreateEditorForEditorProxy(editorProxy)
      // await this.toggleEmptyPortalPaneItem()
    } else {
      this.editorBindingsByEditorProxy.forEach((b) => b.updateTether(followState))
    }

    const editorBinding = this.editorBindingsByEditorProxy.get(editorProxy)
    if (editorBinding && position) {
      editorBinding.updateTether(followState, position)
    }
  }

  private async findOrCreateEditorForEditorProxy (editorProxy) : Promise<vscode.TextEditor> {
    let editor : vscode.TextEditor;
    let editorBinding = this.editorBindingsByEditorProxy.get(editorProxy);
    if (editorBinding) {
      editor = editorBinding.editor
    } else {
      const {bufferProxy} = editorProxy
      const buffer = await this.findOrCreateBufferForBufferProxy(bufferProxy)

      // thinks reload
      await vscode.workspace.openTextDocument(buffer.uri)

      console.log('find buffer, now show it')
      editor = await vscode.window.showTextDocument(buffer)
      editorBinding = new EditorBinding({
        editor,
        portal: this.portal,
        isHost: false
      })
      // keep open editor
      await vscode.commands.executeCommand('workbench.action.keepEditor')

      editorBinding.setEditorProxy(editorProxy)
      editorProxy.setDelegate(editorBinding)

      this.editorBindingsByEditorProxy.set(editorProxy, editorBinding)
      this.editorProxiesByEditor.set(editor, editorProxy)

      editorBinding.onDidDispose(() => {
        this.editorProxiesByEditor.delete(editor)
        this.editorBindingsByEditorProxy.delete(editorProxy)
      })

      // this.sitePositionsController.addEditorBinding(editorBinding)
    }
    return editor
  }

  private async findOrCreateBufferForBufferProxy (bufferProxy) : Promise<vscode.TextDocument> {
    let buffer : vscode.TextDocument;
    let bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy)
    if (bufferBinding) {
      buffer = bufferBinding.buffer
    } else {
      // TODO: cross platform
      const bufferURI = vscode.Uri.parse(`file://${path.join(os.tmpdir(), `/${this.portalId}/`, bufferProxy.uri)}`)

      /* prepare file */
      await require('mkdirp-promise')(path.dirname(bufferURI.fsPath))
      fs.writeFileSync(bufferURI.fsPath, '')

      buffer = await vscode.workspace.openTextDocument(bufferURI)

      bufferBinding = new BufferBinding({
        buffer,
        isHost: false,
        didDispose: () => this.bufferBindingsByBufferProxy.delete(bufferProxy)
      })

      bufferBinding.setBufferProxy(bufferProxy)
      bufferProxy.setDelegate(bufferBinding)

      this.bufferBindingsByBufferProxy.set(bufferProxy, bufferBinding)
    }
    return buffer
  }

}
