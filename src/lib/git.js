import {exec} from 'mz/child_process';
// eslint-disable-next-line no-unused-vars
import * as GitHub from '@octokit/rest';
import {writeFile} from 'mz/fs';

import {readFileOrEmpty} from './file';

const {debug, format: f} = require('@ianwremmel/debug');
const d = debug(__filename);

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
export async function addAndCommit(files, msg) {
  d('Resetting any staged files');
  await exec('git reset .');
  d('Done');

  if (files.includes('package.json')) {
    files.push('package-lock.json');
  }

  d('Adding files', files);
  await exec(`git add ${files.join(' ')}`);
  d('Added files');

  d('Committing');
  await exec(`git commit -m '${msg}'`);
  d('Done');
}

/**
 * Creates a remote repository on GitHub
 * @param {GitHub} github
 * @param {Object} details
 * @param {string|undefined} [details.org] - if not specified, repo will be created for
 * current user
 * * @param {string} [details.owner] - if not specified, repo will be created for
 * current user
 * @param {string} details.name - github repo name
 * @param {boolean} details.private
 * @returns {Promise<GitHub.ReposGetResponse|GitHub.ReposCreateForAuthenticatedUserResponse|GitHub.ReposCreateInOrgResponse>} - The GitHub API repo object
 */
export async function getOrCreateRemoteRepo(github, details) {
  try {
    if (details.org) {
      d(f`Creating github repo ${details.name} for org ${details.org}`);
      // this is to trick the typescript compiler into noticing that org is
      // definitely defined here
      const realDetails = {
        name: details.name,
        org: details.org,
        private: details.private,
      };
      const {data: githubRepo} = await github.repos.createInOrg(realDetails);
      d('Done');
      return githubRepo;
    }

    d(f`Creating github repo ${details.name} for current github user`);
    const {data: githubRepo} = await github.repos.createForAuthenticatedUser(
      details
    );
    d('Done');
    return githubRepo;
  } catch (err) {
    // 422 probably implies we've already got a repo by that name, so, assume
    // this is the same repo.
    if (err.status !== 422) {
      throw err;
    }
    d('Project already seems to exist on GitHub');
    d('Fetching GitHub repo details');
    const repoDetails = {
      owner: details.org || details.owner,
      repo: details.name,
    };
    const {data: githubRepo} = await github.repos.get(repoDetails);
    d('Done');
    return githubRepo;
  }
}

/**
 * Creates a local git repository and points its origin at githubRepoObject
 * @param {Object} [githubRepoObject]
 */
export async function initializeLocalRepo(githubRepoObject) {
  try {
    d('Checking if this project has a git repo');
    await exec('git status');
    d('Git has already been initialized for this project');
  } catch (err) {
    d(f`Initializing git repo in ${process.cwd()}`);
    await exec('git init');
    d(f`Initialized git repo in ${process.cwd()}`);
  }

  try {
    d('Checking if the local repo has any commits');
    await exec('git log');
    d('There are already commits, not adding root commit');
  } catch (err) {
    d('Adding root commit');
    await exec(`git commit --allow-empty -m "${rootCommitMessage}"`);
    d('Added root commit');
  }

  if (githubRepoObject) {
    d('Attempting to add GitHub repo as origin remote');
    try {
      await exec(`git remote add origin ${githubRepoObject.ssh_url}`);
      d('Added origin remote');
    } catch (err) {
      if (!err.message.includes('remote origin already exists.')) {
        d('Could not add origin remote.');
        debug(err);
        throw err;
      }
      d('Remote origin already exists');
    }
  }
}

/**
 * Pushes the local branch to the remote and sets up branch tracking
 * @param {Object} [options]
 * @param {string} [options.branch=master]
 * @param {string} [options.remote=origin]
 */
export async function pushAndTrackBranch({
  branch = 'master',
  remote = 'origin',
} = {}) {
  await exec(`git push -u ${remote} ${branch}:${branch}`);
}

/**
 * @param {string[]} [ignored=[]]
 */
export async function addToGitIgnore(ignored = []) {
  d('reading .gitignore');
  const raw = String(await readFileOrEmpty('.gitignore'));
  const gitignore = new Set(raw.split('\n'));

  d('adding ${ignored.join(', ') to .gitignore');
  for (const ignore of ignored) {
    gitignore.add(ignore);
  }

  d('writing .gitignore');
  await writeFile(
    '.gitignore',
    Array.from(gitignore)
      .filter(Boolean)
      .join('\n')
  );
}
