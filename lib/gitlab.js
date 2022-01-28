"use babel";

const axios = require("axios").default;

function getConfig() {
  const gitlabApiToken = inkdrop.config.get("gitlab-sync.gitlabApiToken");
  const projectId = inkdrop.config.get("gitlab-sync.projectId");
  const basePath = inkdrop.config.get("gitlab-sync.basePath");
  const skipNoteRootDir = inkdrop.config.get("gitlab-sync.skipNoteRootDir");
  const addMetadata = inkdrop.config.get("gitlab-sync.addMetadata");
  const branch = inkdrop.config.get("gitlab-sync.branch");

  return {
    gitlabApiToken,
    projectId,
    basePath,
    skipNoteRootDir,
    addMetadata,
    branch,
  };
}

function getBookPath(bookId, skipRootDir) {
  const { books } = inkdrop.store.getState();

  var currentBook = books.hash[bookId];
  var path = [currentBook];

  while (currentBook.parentBookId !== null) {
    currentBook = books.hash[currentBook.parentBookId];
    path.push(currentBook);
  }
  path.reverse();

  if (skipRootDir) {
    path = path.slice(1);
  }

  return path.reduce(
    (acc, book) =>
      acc.concat("/", book.name.toLowerCase().replaceAll(" ", "_")),
    "",
  );
}

function tagNamesAsString(noteTags) {
  const { tags } = inkdrop.store.getState();

  return noteTags
    .reduce((acc, noteTag) => acc.concat(tags.hash[noteTag].name, ", "), "")
    .replace(/,\s*$/, "");
}

function buildFilePath(title, basePath) {
  const filename = title.toLowerCase().replaceAll(" ", "_");

  return basePath + "/" + filename + ".md";
}

function buildMetadata(note) {
  const metadata = {
    title: `Title: ${note.title}`,
    date: `Date: ${new Date(note.createdAt).toISOString().split("T")[0]}`,
    modified: `Modified: ${
      new Date(note.updatedAt).toISOString().split("T")[0]
    }`,
    category: "Category: posts",
    tags: `Tags: ${tagNamesAsString(note.tags)}`,
  };

  return (
    Object.values(metadata)
      .slice(1)
      .reduce((acc, text) => acc + "\n" + text, metadata.title) + "\n\n"
  );
}

function postURL() {
  const { projectId } = getConfig();

  return `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`;
}

function buildRequestHeaders() {
  const { gitlabApiToken } = getConfig();

  return {
    "PRIVATE-TOKEN": gitlabApiToken,
    "Content-Type": "application/json",
  };
}

async function checkFileExistsOnGitlab(filePath) {
  const { projectId, branch } = getConfig();

  const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
    filePath.replace("/", ""),
  )}?ref=${branch}`;

  const headers = buildRequestHeaders();

  let fileExists = false;

  const response = await axios.get(url, { headers, validateStatus: false });
  if (response.status == 200) {
    fileExists = response.data;
  }

  return fileExists;
}

function filesHaveDiff(localContent, remoteContentBase64) {
  const remoteContent = atob(remoteContentBase64);

  return localContent !== remoteContent;
}

async function commitToGitlab(noteTitle, filePath, content) {
  const { branch } = getConfig();

  const commitMessage = "Updating note " + noteTitle + " [from Inkdrop plugin]";

  const headers = buildRequestHeaders();

  var action = "create";

  const existingFile = await checkFileExistsOnGitlab(filePath);
  if (existingFile) {
    action = "update";
    if (!filesHaveDiff(content, existingFile.content)) {
      showDialog("Did not commit file. No diff with remote.");
      console.log("gitlab-sync. did not commit file. no diff with remote");
      return;
    }
  }

  const jsonContents = {
    branch: branch,
    commit_message: commitMessage,
    actions: [
      {
        action: action,
        file_path: filePath,
        content: content,
      },
    ],
  };

  const response = await axios.post(postURL(), jsonContents, { headers });

  if ([200, 201].includes(response.status)) {
    showDialog("File commited successfully");
  }
}

function showDialog(text) {
  inkdrop.commands.dispatch(document.body, "gitlab-sync:toggle-dialog", {
    text,
  });
}

function getFilePathForNote(note) {
  const config = getConfig();
  const bookPath = getBookPath(note.bookId, config.skipNoteRootDir);

  const pathOnRepo = config.basePath.concat(bookPath);
  const filePath = buildFilePath(note.title, pathOnRepo);

  return filePath;
}

async function commit(note) {
  const config = getConfig();

  const filePath = getFilePathForNote(note);

  var fileContents = note.body;

  if (config.addMetadata) {
    let metadata = buildMetadata(note);
    fileContents = metadata + fileContents;
  }

  await commitToGitlab(note.title, filePath, fileContents);
}

async function remove(note) {
  console.log("remove that note from gitlab!");
  showDialog("Remove that note!");
}

module.exports = {
  commit,
  remove,
};
