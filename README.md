# README

Export notes as Markdown to a Gitlab repository.

## Setup

0. Get access token (with `api` scope enabled) from Gitlab [here](https://gitlab.com/-/profile/personal_access_tokens)
1. Install plugin
2. update `init.js` script on Inkdrop (open from Preferences)
```js
inkdrop.config.set('gitlab-sync.gitlabApiToken','')
inkdrop.config.set('gitlab-sync.projectId', '')
inkdrop.config.set('gitlab-sync.basePath', '')
inkdrop.config.set('gitlab-sync.skipNoteRootDir', true)
inkdrop.config.set('gitlab-sync.addMetadata', true)
inkdrop.config.set('gitlab-sync.branch', 'master')
```

