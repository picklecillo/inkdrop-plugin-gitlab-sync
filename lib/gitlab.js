"use babel";

const axios = require("axios").default;

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

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

function commitURL() {
  const { projectId } = getConfig();

  return `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`;
}

function fileURL(filePath) {
  const { branch, projectId } = getConfig();

  return `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
    filePath.replace("/", ""),
  )}?ref=${branch}`;
}

function buildRequestHeaders() {
  const { gitlabApiToken } = getConfig();

  return {
    "PRIVATE-TOKEN": gitlabApiToken,
    "Content-Type": "application/json",
  };
}

async function checkFileExistsOnGitlab(filePath) {
  const url = fileURL(filePath);

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

  const commitMessage = `${capitalize(
    action,
  )} note: ${noteTitle} [from Inkdrop plugin]`;
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
  const headers = buildRequestHeaders();

  const response = await axios.post(commitURL(), jsonContents, { headers });

  if ([200, 201].includes(response.status)) {
    showDialog("File commited successfully");
  }
}

async function removeFromGitlab(filePath) {
  const { branch } = getConfig();

  const existingFile = await checkFileExistsOnGitlab(filePath);

  var remove = true;
  if (!existingFile) {
    showDialog(
      "Could not remove note. A file was not found on path" + filePath,
    );
    console.log(
      "gitlab-sync. Could not remove note. A file was not found on path" +
        filePath,
    );
    return;
  }

  const commitMessage =
    "Removing note on path " + filePath + " [from Inkdrop plugin]";
  const jsonContents = {
    branch: branch,
    commit_message: commitMessage,
  };

  const headers = buildRequestHeaders();

  const response = await axios.delete(fileURL(filePath), {
    headers,
    data: jsonContents,
  });

  if (response.status == 204) {
    showDialog("File removed successfully");
  } else {
    showDialog("File removal error");
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
  const config = getConfig();

  const filePath = getFilePathForNote(note);

  await removeFromGitlab(filePath);
}

module.exports = {
  commit,
  remove,
};
