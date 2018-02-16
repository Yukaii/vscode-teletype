import * as vscode from 'vscode';
import {TeletypeClient, Errors, FollowState} from '@atom/teletype-client';
import Portal from '@atom/teletype-client/lib/portal';
import EditorProxy from '@atom/teletype-client/lib/editor-proxy';
import BufferProxy from '@atom/teletype-client/lib/buffer-proxy';

import BufferBinding from './BufferBinding';
import EditorBinding from './EditorBinding';

import { NotImplementedError } from './error';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export default class GuestPortalBinding {
  public client : TeletypeClient;
  private readonly portalId : string;
  private readonly editor : vscode.TextEditor;
  private portal : Portal;
  private lastEditorProxyChangePromise : Promise<void>;
  private editorBindingsByEditorProxy : Map<EditorProxy, EditorBinding>;
  private bufferBindingsByBufferProxy : Map<BufferProxy, BufferBinding>;
  private bufferBindingsByBuffer : Map<vscode.TextDocument, BufferBinding>
  private editorProxiesByEditor : WeakMap<vscode.TextEditor, EditorProxy>;

  constructor({ client, portalId, editor }) {
    this.client = client;
    this.portalId = portalId;
    this.editor = editor;
    this.lastEditorProxyChangePromise = Promise.resolve()
    this.editorBindingsByEditorProxy = new Map()
    this.bufferBindingsByBufferProxy = new Map()
    this.bufferBindingsByBuffer = new Map()
    this.editorProxiesByEditor = new WeakMap()
  }

  async initialize () {
    try {
      this.portal = await this.client.joinPortal(this.portalId)
      await this.portal.setDelegate(this)

      vscode.workspace.onDidChangeTextDocument(this.applyChanges.bind(this))
    } catch (error) {
      let message, description
      if (error instanceof Errors.PortalNotFoundError) {
        message = 'Portal not found'
        description = 'No portal exists with that ID. Please ask your host to provide you with their current portal ID.'
      } else {
        message = 'Failed to join portal'
        description =
          `Attempting to join portal ${this.portalId} failed with error: <code>${error.message}</code>\n\n` +
          'Please wait a few moments and try again.'
      }
      vscode.window.showErrorMessage(`${message}: ${description}`);
      console.error(`${message}: ${description}`)
    }
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
    console.error('removeEditorProxy')
    throw NotImplementedError
  }

  updateActivePositions (positionsBySiteId) {
    // Ignore this
    // throw NotImplementedError
  }

  hostDidClosePortal () {
    console.error('hostDidClosePortal')
    throw NotImplementedError
  }

  hostDidLoseConnection () {
    console.error('hostDidLoseConnection')
    throw NotImplementedError
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
    console.error('dispose')
    throw NotImplementedError

    // TODO: unregisterTextDocumentChangeEvent
  }

  private async _updateTether (followState, editorProxy, position) {
    if (followState === FollowState.RETRACTED) {
      const editor = await this.findOrCreateEditorForEditorProxy(editorProxy)
      // await this.toggleEmptyPortalPaneItem()
    } else {
      // FIXME: WTF, upstream bug
      this.editorBindingsByEditorProxy.forEach((b) => b.updateTether(followState, undefined))
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
      const bufferBinding = this.bufferBindingsByBufferProxy.get(bufferProxy)

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
      // bind editor to bufferBinding lately
      // since we need vscode.TextEditor instance to apply edit operations
      bufferBinding.setEditor(editor);

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

      this.bufferBindingsByBuffer.set(buffer, bufferBinding);
      this.bufferBindingsByBufferProxy.set(bufferProxy, bufferBinding);
    }
    return buffer
  }

  applyChanges (event : vscode.TextDocumentChangeEvent) {
    const bufferBinding = this.bufferBindingsByBuffer.get(event.document)
    if (bufferBinding) {
      bufferBinding.applyChanges(event.contentChanges)
    }
  }

}
