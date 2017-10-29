'use strict';

/* eslint-disable max-statements */

const {exec} = require(`child_process`);
const debug = require(`debug`)(`proj:command:init`);
const GitHubAPI = require(`github`);
const kit = require(`nodegit-kit`);
const nodegit = require(`nodegit`);

const CircleCI = require(`../lib/circleci`);
const netrc = require(`../lib/netrc`);
const {template} = require(`../lib/templating`);

module.exports = {
  builder: {
    d: {
      alias: `short-description`,
      demandOption: true,
      type: `string`
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
    template(`README.md`, context);
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
    await addAndCommit(repo, context, [
      `.github/CONTRIBUTING.md`,
      `.editorconfig`,
      `.eslintrc.yml`,
      `.gitignore`,
      `.npmrc`,
      `LICENSE`
    ], `chore(tooling): create various project files`);

    // Reminder, we create package.json late so that greenkeeper doesn't run
    // until after Circle CI is setup
    debug(`Creating package.json`);
    await addAndCommit(repo, context, [
      `package.json`
    ], `feat(package): create initial package.json`);

    debug(`Pushing package.json and project files to GitHub`);
    await push(remote);
    debug(`Done`);

    // TODO drop a cci config file

    // Echo log statement and launch browser
    console.log(
      `Unfortunately, the next step doesn't seem to be possible from the GitHub API.
Please check the boxes for
- "Protect this branch"
- "Require status checks to pass before merging"
Please manually enable branch protection and required status checks. You don't
need to require specific checks, just enable the feature. After you've enabled
the features, return to this window.`
    );

    console.log(`Press any key to open github.com`);
    await new Promise((resolve) => process.stdin.once(`data`, resolve));
    exec(`open "https://github.com/${context.github.login}/${context.githubProjectName}/settings/branches/master"`);

    console.log(`Press any key to continue after enabling branch protection`);
    await new Promise((resolve) => process.stdin.once(`data`, resolve));
    debug(`Requiring Circle CI to pass before merging to master`);
    await github.repos.addProtectedBranchRequiredStatusChecksContexts({
      branch: `master`,
      contexts: [
        `ci/circleci`
      ],
      owner: context.github.login,
      repo: context.githubProjectName
    });
    debug(`Done`);

    debug(`Requiring branch to be up to date befor merging`);
    await github.repos.updateProtectedBranchRequiredStatusChecks({
      branch: `master`,
      contexts: [
        `ci/circleci`
      ],
      owner: context.github.login,
      repo: context.githubProjectName,
      strict: true
    });
    debug(`Done`);

    debug(`Protecting master branch from admins`);
    await github.repos.addProtectedBranchAdminEnforcement({
      branch: `master`,
      owner: context.github.login,
      repo: context.githubProjectName
    });
    debug(`Done`);

    process.stdin.unref();
  }
};


/**
 * Copy files and commit them in a group
 *
 * @param {Repository} repo -
 * @param {Object} context -
 * @param {Array<string>} files -
 * @param {string} message -
 * @private
 * @returns {Promise} -
 */
async function addAndCommit(repo, context, files, message) {
  debug(`Creating ${files.join(`, `)}`);
  files.forEach((f) => template(f, context));

  const index = await repo.refreshIndex();
  await index.addAll();
  await index.write();
  await index.writeTree();
  await kit.commit(repo, {message});
  debug(`Done`);
}

/**
 * Push commits to remote repo
 * @param {Remote} remote -
 * @returns {Promise} -
 */
async function push(remote) {
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
}
