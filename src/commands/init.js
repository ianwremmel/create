'use strict';

// TODO move all meaninful code to lib
// TODO make javascript a subcommand

const GitHubAPI = require('@octokit/rest');
const {exec} = require('mz/child_process');
const netrc = require('netrc');

const {CircleCI, followWithCircle} = require('../lib/circleci');
const {d: debug} = require('../lib/debug')(__filename);
const {
  getOrCreateRemoteRepo,
  initializeLocalRepo,
  pushAndTrackBranch
} = require('../lib/git');
const applyCommonScaffolding = require('../lib/scaffolding/common');
const {
  extractCircleCommonFacts,
  extractCreateRepoFacts,
  gatherFacts
} = require('../lib/scaffolding/facts');
const applyJavaScriptScaffolding = require('../lib/scaffolding/javascript');

const github = new GitHubAPI();
if (process.env.GH_TOKEN) {
  github.authenticate({
    token: process.env.GH_TOKEN,
    type: 'oauth'
  });
}
else {
  const auth = netrc()['api.github.com'];
  github.authenticate({
    password: auth.password,
    type: 'basic',
    username: auth.login
  });
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
      coverage: {
        default: true,
        description: 'Configure tests to collect code coverage',
        type: 'boolean'
      },
      engine: {
        default: 6,
        description: 'Minimum node version required for this project. Ignored if not a JavaScript project',
        type: 'number'
      },
      license: {
        default: 'UNLICENSED',
        description: 'Specify a SPDX license type. If MIT, the MIT license file will be included, otherwise you will need to add your own license file later',
        type: 'string'
      },
      localOnly: {
        // Reminder: as part of an implication, we can't default this to `false`
        // and instead need to rely on implicitly casting `undefined`.
        description: 'Setup local files but do not apply remote changes. Note: Network requests will still be made to gather facts.',
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

exports.command = 'init';

exports.desc = 'Configure a project to be stored on GitHub and tracked by CircleCI';

/* eslint-disable max-statements */
/* eslint-disable complexity */

exports.handler = async function handler(argv) {
  const facts = await gatherFacts({github}, argv);

  console.log('Creating GitHub repository');
  facts.githubRepoObject = await getOrCreateRemoteRepo(github, extractCreateRepoFacts(facts));

  console.log('Initializing local repository...');
  await initializeLocalRepo(facts.githubRepoObject);
  console.log('Done');

  if (!argv.localOnly) {
    console.log('Connecting local repository to GitHub...');
    await pushAndTrackBranch();
    console.log('Done');
  }

  if (!argv.localOnly && argv.circle) {
    console.log('Following project with Circle CI');
    await followWithCircle(cci, extractCircleCommonFacts(facts));
    console.log('Done');
  }

  debug('Applying common scaffolding');
  await applyCommonScaffolding(argv, facts);
  debug('Applied common scaffolding');

  if (argv.javascript) {
    debug('Applying common scaffolding');
    await applyJavaScriptScaffolding(argv, facts);
    debug('Applied common scaffolding');
  }

  if (!argv.localOnly) {
    debug('Pushing all changes to GitHub');
    await exec('git push');
    debug('Pushed all changes to GitHub');
  }

  if (!argv.localOnly) {
    console.log('Enforcing branch protection');
    await github.repos.updateBranchProtection({
      branch: 'master',
      enforce_admins: true,
      owner: facts.owner,
      repo: facts.repoName,
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
    if (facts.githubRepoObject) {
      console.log('GitHub:');
      console.log(`  ${facts.githubRepoObject.html_url}`);
    }
    if (argv.circle) {
      console.log('CircleCI:');
      console.log(`  https://circleci.com/gh/${facts.owner}/${facts.repoName}`);
    }

    console.log();
  }
};
