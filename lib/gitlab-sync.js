"use babel";

import gitlab from "./gitlab";
import GitlabSyncMessageDialog from "./gitlab-sync-dialog";

let commandListener = null;

const config = {
  gitlabApiToken: {
    title: "Gitlab personal access token",
    description: "Used to commit to the Gitlab repo. Requires api scope",
    type: "string",
    default: "",
  },
  projectId: {
    title: "Gitlab Project ID ",
    description: "Gitlab project ID",
    type: "string",
    default: "",
  },
  basePath: {
    title: "Base path",
    description: "Base path on repo",
    type: "string",
    default: "",
  },
  skipNoteRootDir: {
    title: "Skip the notes root dir",
    description: "Skip the notes root dir when building the file path",
    type: "boolean",
    default: true,
  },
  addMetadata: {
    title: "Add note metadata",
    description: "Add markdown metadata at beginning of note",
    type: "boolean",
    default: true,
  },
  branch: {
    title: "Branch",
    description: "Branch on repo",
    type: "string",
    default: "master",
  },
};

async function commitToRepo() {
  const { editingNote } = inkdrop.store.getState();

  gitlab.commit(editingNote);
}

async function removeFromRepo() {
  const { editingNote } = inkdrop.store.getState();

  gitlab.remove(editingNote);
}

function activate() {
  inkdrop.components.registerClass(GitlabSyncMessageDialog);
  inkdrop.layouts.addComponentToLayout("modal", "GitlabSyncMessageDialog");
  commandListener = inkdrop.commands.add(document.body, {
    "gitlab-sync:commit": commitToRepo,
    "gitlab-sync:remove": removeFromRepo,
  });
}
function deactivate() {
  inkdrop.layouts.removeComponentFromLayout("modal", "GitlabSyncMessageDialog");
  inkdrop.components.deleteClass(GitlabSyncMessageDialog);
  commandListener.dispose();
}

module.exports = {
  activate,
  deactivate,
  config,
};
