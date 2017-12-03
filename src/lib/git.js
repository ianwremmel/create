'use strict';

const {exec} = require('mz/child_process');

const {d: debug, f} = require('../lib/debug')(__filename);

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
 * Creates a remote repository on GitHub
 * @param {Object} github
 * @param {Object} details
 * @param {string} owner - github org or username
 * @param {string} name - github repo name
 * @returns {Object} - The GitHub API repo object
 */
async function getOrCreateRemoteRepo(github, details) {
  try {
    debug('Creating github repo');
    const {data: githubRepo} = await github.repos.create(details);
    debug('Done');
    return githubRepo;
  }
  catch (err) {
    // 422 probably implies we've already got a repo by that name, so, assume
    // this is the same repo.
    if (err.code !== 422) {
      throw err;
    }
    debug('Project already seems to exist on GitHub');
    debug('Fetching GitHub repo details');
    const repoDetails = {
      owner: details.owner,
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
  }
  catch (err) {
    debug(f`Initializing git repo in ${process.cwd()}`);
    await exec('git init');
    debug(f`Initialized git repo in ${process.cwd()}`);
  }

  try {
    debug('Checking if the local repo has any commits');
    await exec('git log');
    debug('There are already commits, not adding root commit');
  }
  catch (err) {
    debug('Adding root commit');
    await exec(`git commit --allow-empty -m "${rootCommitMessage}"`);
    debug('Added root commit');
  }

  if (githubRepoObject) {
    debug('Attempting to add GitHub repo as origin remote');
    try {
      await exec(`git remote add origin ${githubRepoObject.ssh_url}`);
      debug('Added origin remote');
    }
    catch (err) {
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
 * @param {string} [branch=master]
 * @param {string} [remote=origin]
 */
async function pushAndTrackBranch({branch = 'master', remote = 'origin'} = {}) {
  await exec(`git push -u ${remote} ${branch}:${branch}`);
}

