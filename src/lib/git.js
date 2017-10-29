'use strict';

const debug = require(`debug`)(`proj:lib:git`);
const kit = require(`nodegit-kit`);
const nodegit = require(`nodegit`);

/**
 * Copy files and commit them in a group
 *
 * @param {Repository} repo -
 * @param {Object} context -
 * @param {string} message -
 * @private
 * @returns {Promise} -
 */
exports.addAndCommit = async function addAndCommit(repo, context, message) {
  debug(`Staging all changes`);
  const index = await repo.refreshIndex();
  await index.addAll();
  await index.write();
  await index.writeTree();
  debug(`Done`);

  debug(`Checking for changes`);
  const statuses = await repo.getStatus();
  if (!statuses) {
    debug(`No files are staged, skipping commit message`);
    return;
  }
  debug(`Committing staged files`);
  await kit.commit(repo, {message});
  debug(`Done`);
};

/**
 * Push commits to remote repo
 * @param {Remote} remote -
 * @returns {Promise} -
 */
exports.push = async function push(remote) {
  await remote.push([
    `refs/heads/master:refs/heads/master`
  ],
  {
    callbacks: {
      certificateCheck() {
        return 1;
      },
      credentials(url, userName) {
        return nodegit.Cred.sshKeyFromAgent(userName);
      }
    }
  });
};


exports.getLocalRepo = async function getLocalRepo() {
  debug(`Attempting to open current directory as git repo`);
  const repo = await nodegit.Repository.open(`${process.cwd()}/.git`);
  debug(`Done`);
  return repo;
};

/**
 * Get the local repository or create a new one with an empty root commit.
 * @returns {Repository} -
 */
exports.getOrCreateLocalRepo = async function getOrCreateLocalRepo() {
  try {
    return await exports.getLocalRepo();
  }
  catch (err) {
    debug(`No repo found in current directory`);
    debug(`Creating repository with empty root commit`);

    const repo = await kit.init(`.`, {
      commit: true,
      message: `root - this space intentionally left blank

This empty commit serves as a root for rebases early in a projects life cycle
and prevents various git-based tools from breaking when they try to display data
about the repository.

For more details, see [Always Start With An Empty Commit](https://bit-booster.com/doing-git-wrong/2017/01/02/git-init-empty/)
for the problems this solves and a history of where the idea came from.
`
    });
    debug(`Done`);
    return repo;
  }
};

exports.getGithubDetailsFromRepo = async function getGithubDetailsFromRepo() {
  debug(`Getting github details from repo`);
  const repository = await exports.getLocalRepo();
  const origin = await repository.getRemote(`origin`);
  const url = origin.url();
  const [
    owner,
    repo
  ] = url.split(`:`)
    .pop()
    .replace(`.git`, ``)
    .split(`/`);
  debug(`Done`);
  return {
    owner,
    repo
  };
};

exports.getOrCreateRemote = async function getOrCreateRemote(repo, name, url) {
  try {
    debug(`Creating remote ${name} at ${url}`);
    const remote = await nodegit.Remote.create(repo, name, url);
    debug(`Done`);
    return remote;
  }
  catch (err) {
    debug(`Remote ${name} already exists`);
    debug(`Opening remote ${name}`);
    const remote = await repo.getRemote(name);
    if (remote.url() !== url) {
      console.warn(`Remote ${name} already existed but ${remote.url()} does not match ${url}`);
    }
    debug(`Done`);
    return remote;
  }
};
