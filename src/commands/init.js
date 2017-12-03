'use strict';

const GitHubAPI = require('github');

const {CircleCI, followWithCircle} = require('../lib/circleci');
const {
  getOrCreateRemoteRepo, initializeLocalRepo, pushAndTrackBranch
} = require('../lib/git');

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

exports.builder = {
  circle: {
    default: true,
    description: 'Configure Circle CI to track the project',
    type: 'boolean'
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
  }
};

exports.command = 'init';

exports.desc = 'Scaffold a new project';

exports.handler = async function handler(argv) {

  const {data: githubUserDetails} = await github.users.get({});

  const owner = argv.owner || githubUserDetails.login;
  const repoName = argv.repoName || process.cwd()
    .split('/')
    .pop();

  console.log('Creating GitHub repository');
  const githubRepoObject = await getOrCreateRemoteRepo(github, {
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

