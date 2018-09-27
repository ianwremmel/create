'use strict';

/**
 * @typedef {Object} CreateArgs
 * @property {boolean} localOnly
 * @property {boolean} public
 * @property {string} [org]
 */
const {exec} = require('mz/child_process');

const {scaffold} = require('./scaffold');
const {d: debug} = require('./lib/debug')(__filename);
const {exists} = require('./lib/file');
const {addAndCommit} = require('./lib/git');
const {template} = require('./lib/templating');
const {CircleCI, followWithCircle} = require('./lib/circleci');
const github = require('./lib/github');
const {
  getOrCreateRemoteRepo,
  initializeLocalRepo,
  pushAndTrackBranch
} = require('./lib/git');
const {follow} = require('./lib/dependabot');

/* eslint-disable complexity */

/**
 * @param {CreateArgs} argv
 */
async function create(argv) {
  try {
    const cci = new CircleCI();

    const repoName = process
      .cwd()
      .split('/')
      .pop();
    if (!repoName) {
      throw new TypeError('This line cannot be hit');
    }

    const {data: githubUserObject} = await github.users.get({});

    let org = githubUserObject.login;
    let orgName = githubUserObject.name;
    if (argv.org) {
      const {data: githubOrgObject} = await github.orgs.get({org: argv.org});
      org = githubOrgObject.login.toLowerCase();
      orgName = githubOrgObject.name;
    }

    const packageName = `@${org}/${repoName}`;

    console.log('Creating GitHub repository');
    const remoteRepo = await getOrCreateRemoteRepo(github, {
      name: repoName,
      org,
      owner: org || githubUserObject.login,
      private: !argv.public
    });
    console.log('Done');

    console.log('Initializing local repository...');
    await initializeLocalRepo(remoteRepo);
    console.log('Done');

    console.log('Connecting local repository to GitHub...');
    await pushAndTrackBranch();
    console.log('Done');

    console.log('Following project with Circle CI');
    await followWithCircle(cci, {
      project: repoName,
      username: org
    });
    console.log('Done');

    if (!(await exists('.editorconfig'))) {
      debug('creating .editorconfig');
      await template('.editorconfig', {});

      debug('committing .editorconfig');
      await addAndCommit(
        ['.editorconfig'],
        'build(tooling): add .editorconfig'
      );
    }

    await scaffold(
      {
        githubUserObject,
        org,
        orgName,
        packageName,
        remoteRepo,
        repoName
      },
      github
    );

    if (!argv.localOnly) {
      console.log('Pushing all changes to GitHub');
      await exec('git push');
      console.log('Pushed all changes to GitHub');
    }

    if (!argv.localOnly) {
      console.log('Enforcing branch protection');
      /* eslint-disable camelcase */
      // @ts-ignore - the types for
      await github.repos.updateBranchProtection({
        branch: 'master',
        enforce_admins: true,
        owner: org,
        repo: repoName,
        required_pull_request_reviews: null,
        required_status_checks: {
          contexts: ['ci/circleci: lint', 'ci/circleci: test'],
          strict: true
        },
        restrictions: null
      });
      /* eslint-enable camelcase */
    }

    if (!argv.localOnly) {
      console.log('Following project with dependabot');
      try {
        await follow(
          {
            githubRepoObject: remoteRepo,
            githubUserObject
          },
          github
        );
        console.log('Done');
      } catch (err) {
        console.error('Failed to follow project with dependabot');
        console.error(err);
      }
    }

    if (argv.localOnly) {
      console.log(
        'Your project has been configured locally, but since you specified localOnly, some actions setup could not be completed'
      );
    } else {
      console.log();
      console.log('Your project can be viewed at the following urls');
      if (remoteRepo) {
        console.log('GitHub:');
        console.log(`  ${remoteRepo.html_url}`);

        console.log('CircleCI:');
        console.log(`  https://circleci.com/gh/${org}/${repoName}`);
      }

      console.log();
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
module.exports = create;

/* eslint-enable complexity */