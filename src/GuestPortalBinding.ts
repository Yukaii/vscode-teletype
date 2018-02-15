import * as vscode from 'vscode';
import {TeletypeClient} from '@atom/teletype-client';
import Protal from '@atom/teletype-client/lib/portal'

export default class GuestPortalBinding {
  public client : TeletypeClient;
  private readonly portalId : string;
  private readonly editor : vscode.TextEditor;
  private portal : Protal;

  constructor({ client, portalId, editor }) {
    this.client = client;
    this.portalId = portalId;
    this.editor = editor;
  }

  async initialize () {
    this.portal = await this.client.joinPortal(this.portalId)
    await this.portal.setDelegate(this)
  }

  siteDidJoin (siteId) {
    throw('Not implemented yet')
  }

  siteDidLeave (siteId) {
    throw('Not implemented yet')
  }

  addEditorProxy (editorProxy) {
    throw('Not implemented yet')
  }

  removeEditorProxy (editorProxy) {
    throw('Not implemented yet')
  }

  updateActivePositions (positionsBySiteId) {
    throw('Not implemented yet')
  }

  updateTether (followState, editorProxy, position) {
    throw('Not implemented yet')
  }

  dispose () {
    throw('Not implemented yet')
  }

}
