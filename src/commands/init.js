'use strict';

const GitHubAPI = require('github');
const {exec} = require('mz/child_process');

const {CircleCI, followWithCircle} = require('../lib/circleci');
const {
  addAndCommit,
  getOrCreateRemoteRepo,
  initializeLocalRepo,
  pushAndTrackBranch
} = require('../lib/git');
const {exists} = require('../lib/file');
const {template} = require('../lib/templating');
const {d: debug} = require('../lib/debug')(__filename);

const github = new GitHubAPI();
if (process.env.GH_TOKEN) {
  github.authenticate({
    token: process.env.GH_TOKEN,
    type: 'oauth'
  });
}
else {
  github.authenticate({type: 'netrc'});
}

const cci = new CircleCI();

exports.builder = function builder(yargs) {
  return yargs
    .implies('readme', 'short-description')
    .implies('license', 'readme')
    .options({
      circle: {
        default: true,
        description: 'Configure Circle CI to track the project',
        type: 'boolean'
      },
      license: {
        description: 'Specify a SPDX license type. If MIT, the MIT license file will be included, otherwise you will need to add your own license file later',
        type: 'string'
      },
      localOnly: {
        // Reminder: as part of an implication, we can't default this to `false`
        // and instead need to rely on implicitly casting `undefined`.
        description: 'Setup local files but do apply remote changes. Note: Network requests will still be made to gather facts.',
        type: 'boolean'
      },
      owner: {
        description: 'GitHub org or username to which this project will belong. Defaults to the current GitHub user if not specified.',
        type: 'string'
      },
      private: {
        default: true,
        description: 'Should the project be public or private?',
        type: 'boolean'
      },
      repoName: {
        description: 'GitHub repository name. Defaults to the current directory if not specified',
        type: 'string'
      },
      shortDescription: {
        description: 'Used in the README, at the top of the GitHub page, in package.json',
        type: 'string'
      }
    });
};

// TODO gather facts as early as possible and move a 'facts' object around
// // TODO package.json (use --license, --short-description)
// // TODO eslint
// // TODO commitlint
// // TODO .github
// // TODO CONTRIBUTE
// // TODO ISSUE TEMPLATE
// TODO --full-defaults so we don't need to opt into every single option
// TODO update usage in main README

async function applyGenericScaffolding(argv, {
  githubRepoObject,
  githubUserDetails
}) {
  if (argv.editorconfig && !await exists('.editorconfig')) {
    await template('.editorconfig', {});
    await addAndCommit([
      '.editorconfig'
    ], 'build(tooling): add .editorconfig');
  }

  if (argv.readme && !await exists('README.md')) {
    template('README.md', {
      githubDisplayName: githubUserDetails.name,
      githubRepoName: githubRepoObject.name,
      githubUserName: githubUserDetails.login,
      license: argv.license || 'UNKNOWN',
      shortDescription: argv.shortDescription
    });

    if (argv.license === 'MIT' && !await exists('LICENSE')) {
      await template('LICENSE', {licenseHolderDisplayName: githubUserDetails.name});
      await addAndCommit([
        'LICENSE'
      ], 'docs(readme): add LICENSE');
    }

    await addAndCommit([
      'README.md'
    ], 'docs(readme): add README');
  }
}


exports.command = 'init';

exports.desc = 'Configure a project to be stored on GitHub and tracked by CircleCI';

/* eslint-disable max-statements */
/* eslint-disable complexity */

exports.handler = async function handler(argv) {
  const {data: githubUserDetails} = await github.users.get({});

  const owner = argv.owner || githubUserDetails.login;
  const repoName = argv.repoName || process.cwd()
    .split('/')
    .pop();

  console.log('Creating GitHub repository');
  const githubRepoObject = await getOrCreateRemoteRepo(github, {
    description: argv.shortDescription,
    name: repoName,
    owner,
    private: argv.private
  });

  console.log('Initializing local repository...');
  await initializeLocalRepo(githubRepoObject);
  console.log('Done');

  if (!argv.localOnly) {
    console.log('Connecting local repository to GitHub...');
    await pushAndTrackBranch();
    console.log('Done');
  }

  if (!argv.localOnly && argv.circle) {
    console.log('Following project with Circle CI');
    await followWithCircle(cci, {
      project: repoName,
      // This might not work if `owner` is an org. We might need to always rely
      // on `githubUserDetails.login`, but I won't really be able to confirm
      // that until actually having a reason to work with an org.
      username: owner
    });
    console.log('Done');
  }

  await applyGenericScaffolding(argv, {
    githubRepoObject,
    githubUserDetails,
    owner,
    repoName
  });

  if (!argv.localOnly) {
    debug('Pushing all changes to GitHub');
    await exec('git push');
    debug('Pushed all chagnes to GitHub');
  }

  if (!argv.localOnly) {
    console.log('Enforcing branch protection');
    await github.repos.updateBranchProtection({
      branch: 'master',
      enforce_admins: true,
      owner,
      repo: repoName,
      required_pull_request_reviews: null,
      required_status_checks: {
        contexts: [
          // This is the default circle ci job name when circle.yml doesn't
          // exist. We'll probably replace this check without something later in
          // the build
          'ci/circleci'
        ],
        strict: true
      },
      restrictions: null
    });
  }

  if (argv.localOnly) {
    console.log('Your project has been configured locally, but since you specified localOnly, some actions setup could not be completed');
  }
  else {
    console.log();
    console.log('Your project can be viewed at the following urls');
    if (githubRepoObject) {
      console.log('GitHub:');
      console.log(`  ${githubRepoObject.html_url}`);
    }
    if (argv.circle) {
      console.log('CircleCI:');
      console.log(`  https://circleci.com/gh/${owner}/${repoName}`);
    }

    console.log();
  }
};

