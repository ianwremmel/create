'use strict';

/* eslint-disable max-statements */

const {exec} = require(`child_process`);

const debug = require(`debug`)(`proj:command:init`);
const GitHubAPI = require(`github`);
const kit = require(`nodegit-kit`);
const nodegit = require(`nodegit`);

const CircleCI = require(`../lib/circleci`);
const netrc = require(`../lib/netrc`);
const {copy, template} = require(`../lib/templating`);
const {addAndCommit, push} = require(`../lib/git`);

module.exports = {
  builder: {
    d: {
      alias: `short-description`,
      demandOption: true,
      type: `string`
    },
    i: {
      alias: `install`,
      default: true,
      type: `boolean`
    },
    p: {
      alias: `package-name`,
      demandOption: true,
      type: `string`
    },
    private: {
      default: true,
      type: `boolean`
    }
  },
  command: `init`,
  desc: `Initialize a new project`,
  async handler(context) {
    context.githubProjectName = context.packageName
      .split(`/`)
      .pop();

    await netrc.check(`circleci.com`, `https://circleci.com/api/v1.1/me`, context);
    await netrc.check(`api.github.com`, `https://api.github.com/user`, context);

    const cci = new CircleCI();
    debug(`Confirming we can retrieve our user details from Circle CI`);
    await cci.getUser();
    debug(`Done`);

    debug(`Getting user profile from github`);
    const github = new GitHubAPI({debug: context.debug});
    github.authenticate({type: `netrc`});
    context.github = (await github.users.get({})).data;
    debug(`Done`);

    debug(`Creating local git repo with empty root commit`);
    const repo = await kit.init(`.`, {
      commit: true,
      message: `root`
    });
    debug(`Done`);

    debug(`Creating readme`);
    await template(`README.md`, context);
    debug(`Done`);

    debug(`creating github repo`);
    const githubRepo = (await github.repos.create({
      description: context.shortDescription,
      name: context.githubProjectName,
      private: context.private
    })).data;
    debug(`Done`);

    debug(`Pushing first commit to GitHub`);
    const remote = await nodegit.Remote.create(repo, `origin`, githubRepo.ssh_url);
    await kit.commit(repo, {message: `chore(docs): create initial README`});
    await push(remote);
    debug(`Done`);

    debug(`Setting local branch master to track origin/master`);
    const branch = await nodegit.Branch.lookup(repo, `master`, nodegit.Branch.BRANCH.LOCAL);
    await nodegit.Branch.setUpstream(branch, `origin/master`);
    debug(`Done`);

    // TODO increase parallelism for non-private projects
    debug(`Following project on Circle CI`);
    await cci.follow({
      project: context.githubProjectName,
      username: context.github.login
    });
    debug(`Done`);

    debug(`Enable autocancel builds, build fork PRs, and disabling secrets on fork PRs`);
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
    debug(`Done`);

    debug(`Create project dotfiles (and similar)`);
    await template(`.github/CONTRIBUTING.md`, context);
    await template(`.editorconfig`, context);
    await template(`.eslintrc.yml`, context);
    await template(`.gitignore`, context);
    await template(`.npmrc`, context);
    await template(`LICENSE`, context);
    await addAndCommit(repo, context, `chore(tooling): create various project files`);

    // Reminder, we create package.json late so that greenkeeper doesn't run
    // until after Circle CI is setup
    debug(`Creating package.json`);
    await template(`package.json`);
    await addAndCommit(repo, context, `feat(package): create initial package.json`);

    debug(`Creating a Circle CI config file`);
    await copy(`circle.yml`);
    await addAndCommit(repo, context, [], `chore(tooling): configure circleci`);
    debug(`Done`);

    debug(`Pushing package.json and project files to GitHub`);
    await push(remote);
    debug(`Done`);

    debug(`Enabling branch protection`);
    await github.repos.updateBranchProtection({
      branch: `master`,
      enforce_admins: true,
      owner: context.github.login,
      repo: context.githubProjectName,
      required_pull_request_reviews: null,
      required_status_checks: {
        contexts: [
          `ci/circleci: lint`,
          `ci/circleci: test-node-6`,
          `ci/circleci: test-node-8`
        ],
        strict: true
      },
      restrictions: null
    });
    debug(`Done`);

    // TODO print the URLs to github and circle CI

    console.log(`Reminder: to send coverage to coveralls, you need to`);
    // TODO figure out how to follow the project on coveralls, then set the repo
    // token via the Circle API.
    console.log(`- Follow the project on https://coveralls.io`);
    console.log(`- Add the repo token to Circle CI`);

    if (context.install) {
      debug(`Kicking off npm install`);
      exec(`npm install`);
      debug(`done`);
    }

    process.stdin.unref();
  }
};

