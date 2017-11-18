'use strict';

/* eslint-disable max-statements */

const {execSync} = require('child_process');

const debug = require('debug')('proj:command:init');
const nodegit = require('nodegit');
const kit = require('nodegit-kit');

const github = require('../lib/github');
const {exists} = require('../lib/file');
const CircleCI = require('../lib/circleci');
const netrc = require('../lib/netrc');
const {copy, template} = require('../lib/templating');
const {
  addAndCommit, getOrCreateRemote, getOrCreateLocalRepo, push
} = require('../lib/git');

module.exports = {
  builder: {
    d: {
      alias: 'short-description',
      demandOption: true,
      description: 'The short description for the README, package.json, and GitHub',
      type: 'string'
    },
    i: {
      alias: 'install',
      default: true,
      description: 'Run "npm install" after scaffolding.',
      type: 'boolean'
    },
    p: {
      alias: 'package-name',
      demandOption: true,
      description: 'Specify that package\'s name; because of scoped packages, we can\'t reliably get the name from the current directory. If your package is scoped, its GitHub repo name will be the unscoped name.',
      type: 'string'
    },
    private: {
      default: true,
      description: 'Make the GitHub repository private',
      type: 'boolean'
    }
  },
  command: 'init',
  desc: 'Scaffold a new project, push it to GitHub, and configure Circle CI',
  async handler(context) {
    context.githubProjectName = context.packageName
      .split('/')
      .pop();

    await netrc.check('circleci.com', 'https://circleci.com/api/v1.1/me', context);
    await netrc.check('api.github.com', 'https://api.github.com/user', context);

    const cci = new CircleCI();
    debug('Confirming we can retrieve our user details from Circle CI');
    await cci.getUser();
    debug('Done');

    debug('Getting user profile from github');
    context.github = (await github.users.get({})).data;
    debug('Done');

    debug('Getting local repo');
    const repo = await getOrCreateLocalRepo();
    debug('Done');

    if (!await exists('README.md')) {
      debug('Creating readme');
      await template('README.md', context);
      await kit.commit(repo, {message: 'chore(docs): create initial README'});
      debug('Done');
    }

    debug('Getting remote repo');
    const githubRepo = await github.getOrCreateRepo({
      description: context.shortDescription,
      name: context.githubProjectName,
      owner: context.github.login,
      private: context.private
    });
    debug('Done');

    debug('Pushing first commit to GitHub');
    const remote = await getOrCreateRemote(repo, 'origin', githubRepo.ssh_url);
    await push(remote);
    debug('Done');

    debug('Setting local branch master to track origin/master');
    const branch = await nodegit.Branch.lookup(repo, 'master', nodegit.Branch.BRANCH.LOCAL);
    await nodegit.Branch.setUpstream(branch, 'origin/master');
    debug('Done');

    debug('Following project on Circle CI');
    await cci.follow({
      project: context.githubProjectName,
      username: context.github.login
    });
    debug('Done');

    debug('Enable autocancel builds, build fork PRs, and disabling secrets on fork PRs');
    await cci.configure({
      project: context.githubProjectName,
      settings: {
        feature_flags: {
          'autocancel-builds': true,
          'build-fork-prs': true,
          'forks-receive-secret-env-vars': false
        }
      },
      username: context.github.login
    });
    debug('Done');

    debug('Create project dotfiles (and similar)');
    for (const file of [
      '.github/CONTRIBUTING.md',
      '.editorconfig',
      '.eslintrc.yml',
      '.gitignore',
      '.npmrc',
      'commitlint.config.js',
      'LICENSE'
    ]) {
      if (!await exists(file)) {
        template(file, context);
      }
    }
    await addAndCommit(repo, context, 'chore(tooling): create various project files');

    // Reminder, we create package.json late so that greenkeeper doesn't run
    // until after Circle CI is setup
    if (!await exists('package.json')) {
      debug('Creating package.json');
      await template('package.json', context);
      await addAndCommit(repo, context, 'feat(package): create initial package.json');
      debug('Done');
    }

    if (!await exists('circle.yml')) {
      debug('Creating a Circle CI config file');
      await copy('circle.yml');
      await addAndCommit(repo, context, 'chore(tooling): configure circleci');
      debug('Done');
    }

    debug('Pushing package.json and project files to GitHub');
    await push(remote);
    debug('Done');

    debug('Enabling branch protection');
    await github.repos.updateBranchProtection({
      branch: 'master',
      enforce_admins: true,
      owner: context.github.login,
      repo: context.githubProjectName,
      required_pull_request_reviews: null,
      required_status_checks: {
        contexts: [
          'ci/circleci: lint',
          'ci/circleci: test-node-6',
          'ci/circleci: test-node-8'
        ],
        strict: true
      },
      restrictions: null
    });
    debug('Done');

    console.log();
    console.log('Reminder: to send coverage to coveralls, you need to');
    console.log('- Follow the project on https://coveralls.io');
    console.log('- Add the repo token to Circle CI');
    console.log();
    console.log('Your project can be viewed at the following urls');
    console.log('GitHub:');
    console.log(`  ${context.github.url}`);
    console.log('CircleCI:');
    console.log(`  https://circleci.com/gh/${context.github.login}/${context.githubProjectName}`);
    console.log();

    if (context.install) {
      debug('Kicking off npm install');
      execSync('npm install');
      execSync('npm install --save-dev @ianwremmel/eslint-config-standard');
      // It's being escaped for bash, not javascript
      /* eslint-disable no-useless-escape */
      execSync(`
      (
        export PKG=@ianwremmel/eslint-config-standard;
        npm info "$PKG@latest" peerDependencies --json | command sed 's/[\{\},]//g ; s/: /@/g' | xargs npm install --save-dev "$PKG@latest"
      )
      `);
      execSync('git add package.json && git commit -m "chore(deps): eslint config peer deps"');
      /* eslint-enable no-useless-escape */
      debug('done');
    }

    process.stdin.unref();
  }
};
