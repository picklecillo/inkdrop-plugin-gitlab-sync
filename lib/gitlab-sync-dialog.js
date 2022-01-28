"use babel";

import * as React from "react";
import { logger } from "inkdrop";
import { CompositeDisposable } from "event-kit";

export default class GitlabSyncMessageDialog extends React.Component {
  subscriptions = new CompositeDisposable();

  constructor(props) {
    super(props);

    this.subscriptions.add(
      inkdrop.commands.add(document.body, {
        "gitlab-sync:toggle-dialog": this.toggle,
      }),
    );

    this.state = { text: "" };
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  render() {
    const MessageDialog = inkdrop.components.getComponentClass("MessageDialog");
    return (
      <MessageDialog ref={(el) => (this.dialogRef = el)} title="Gitlab Sync">
        {this.state.text}
      </MessageDialog>
    );
  }

  toggle = ({ detail }) => {
    this.setState({ text: detail.text });

    const { dialogRef } = this;
    if (!dialogRef.isShown) {
      dialogRef.showDialog();
    } else {
      dialogRef.dismissDialog();
    }
  };
}
