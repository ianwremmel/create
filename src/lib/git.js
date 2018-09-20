'use strict';

const {exec} = require('mz/child_process');
// eslint-disable-next-line no-unused-vars
const GitHub = require('@octokit/rest');

const {d: debug, f} = require('./debug')(__filename);

exports.addAndCommit = addAndCommit;
exports.getOrCreateRemoteRepo = getOrCreateRemoteRepo;
exports.initializeLocalRepo = initializeLocalRepo;
exports.pushAndTrackBranch = pushAndTrackBranch;

const rootCommitMessage = `root - this space intentionally left blank

This empty commit serves as a root for rebases early in a projects life
cycle and prevents various git-based tools from breaking when they try
to display data about the repository.

See the link below for the problems this solves and a history of where
the idea came from.

https://bit-booster.com/doing-git-wrong/2017/01/02/git-init-empty/
`;

/**
 * Add and commit a set of files
 * @param {Array<string>} files
 * @param {string} msg
 */
async function addAndCommit(files, msg) {
  debug('Resetting any staged files');
  await exec('git reset .');
  debug('Done');

  debug('Adding files', files);
  await exec(`git add ${files.join(' ')}`);
  debug('Added files');

  debug('Committing');
  await exec(`git commit -m '${msg}'`);
  debug('Done');
}

/**
 * Creates a remote repository on GitHub
 * @param {GitHub} github
 * @param {Object} details
 * @param {string} [details.org] - if not specified, repo will be created for
 * current user
 * * @param {string} [details.owner] - if not specified, repo will be created for
 * current user
 * @param {string} details.name - github repo name
 * @param {boolean} details.private
 * @returns {Promise<GitHub.ReposGetResponse|GitHub.ReposCreateResponse>} - The GitHub API repo object
 */
async function getOrCreateRemoteRepo(github, details) {
  try {
    if (details.org) {
      debug(f`Creating github repo ${details.name} for org ${details.org}`);
      // this is to trick the typescript compiler into noticing that org is
      // definitely defined here
      const realDetails = {
        name: details.name,
        org: details.org,
        private: details.private
      };
      const {data: githubRepo} = await github.repos.createForOrg(realDetails);
      debug('Done');
      return githubRepo;
    }

    debug(f`Creating github repo ${details.name} for current github user`);
    const {data: githubRepo} = await github.repos.create(details);
    debug('Done');
    return githubRepo;
  } catch (err) {
    // 422 probably implies we've already got a repo by that name, so, assume
    // this is the same repo.
    if (err.code !== 422) {
      throw err;
    }
    debug('Project already seems to exist on GitHub');
    debug('Fetching GitHub repo details');
    const repoDetails = {
      owner: details.org || details.owner,
      repo: details.name
    };
    const {data: githubRepo} = await github.repos.get(repoDetails);
    debug('Done');
    return githubRepo;
  }
}

/**
 * Creates a local git repository and points its origin at githubRepoObject
 * @param {Object} [githubRepoObject]
 */
async function initializeLocalRepo(githubRepoObject) {
  try {
    debug('Checking if this project has a git repo');
    await exec('git status');
    debug('Git has already been initialized for this project');
  } catch (err) {
    debug(f`Initializing git repo in ${process.cwd()}`);
    await exec('git init');
    debug(f`Initialized git repo in ${process.cwd()}`);
  }

  try {
    debug('Checking if the local repo has any commits');
    await exec('git log');
    debug('There are already commits, not adding root commit');
  } catch (err) {
    debug('Adding root commit');
    await exec(`git commit --allow-empty -m "${rootCommitMessage}"`);
    debug('Added root commit');
  }

  if (githubRepoObject) {
    debug('Attempting to add GitHub repo as origin remote');
    try {
      await exec(`git remote add origin ${githubRepoObject.ssh_url}`);
      debug('Added origin remote');
    } catch (err) {
      if (!err.message.includes('remote origin already exists.')) {
        debug('Could not add origin remote.');
        debug(err);
        throw err;
      }
      debug('Remote origin already exists');
    }
  }
}

/**
 * Pushes the local branch to the remote and sets up branch tracking
 * @param {Object} [options]
 * @param {string} [options.branch=master]
 * @param {string} [options.remote=origin]
 */
async function pushAndTrackBranch({branch = 'master', remote = 'origin'} = {}) {
  await exec(`git push -u ${remote} ${branch}:${branch}`);
}
