import * as inquirer from 'inquirer';
import {debug, format as f} from '@ianwremmel/debug';
import {exec} from 'mz/child_process';

import {followWithCircleCI} from './lib/circle';
import {exists} from './lib/file';
import {addAndCommit} from './lib/git';
import {init as initGitHub} from './lib/github';
import {template} from './lib/templating';
import {scaffold} from './scaffold';

const d = debug(__filename);

const {
  getOrCreateRemoteRepo,
  initializeLocalRepo,
  pushAndTrackBranch,
} = require('./lib/git');
const {follow} = require('./lib/dependabot');

/* eslint-disable complexity */

async function create() {
  try {
    const {circleToken, license, org, publicProject} = await inquirer.prompt([
      {
        choices: ['MIT', 'UNLICENSED'],
        default: 'MIT',
        message: 'Select a license',
        name: 'license',
        type: 'list',
      },
      {
        default: '',
        message: 'GitHub Org (optional)',
        name: 'org',
        transformer(input) {
          return input.toLowerCase();
        },
      },
      {
        default: false,
        message: "Should this project's GitHub repo be public?",
        // public is a reserved word
        name: 'publicProject',
        type: 'confirm',
      },
      {
        default: await (async () => {
          try {
            const res = await exec("op get item 'Circle CI API Token'")
              .toString()
              .trim();
            const data = JSON.parse(res);
            return data.details.password;
          } catch {
            return '';
          }
        })(),
        message: 'Circle CI API Token',
        name: 'circleciToken',
        type: 'password',
      },
    ]);

    const repoName = process
      .cwd()
      .split('/')
      .pop();
    if (!repoName) {
      throw new TypeError('This line cannot be hit');
    }

    const github = await initGitHub();

    const {data: githubUserObject} = await github.users.getAuthenticated({});

    let orgName;
    if (org) {
      const {data: githubOrgObject} = await github.orgs.get({org});
      orgName = githubOrgObject.name;
    }

    const githubAccountName = org || githubUserObject.login;
    const githubDisplayName = orgName || githubUserObject.name;
    const packageName = `@${githubAccountName}/${repoName}`;

    console.log('Creating GitHub repository');
    const remoteRepo = await getOrCreateRemoteRepo(github, {
      name: repoName,
      org,
      owner: githubAccountName,
      private: !publicProject,
    });
    console.log('Done');

    console.log('Initializing local repository...');
    await initializeLocalRepo(remoteRepo);
    console.log('Done');

    console.log('Connecting local repository to GitHub...');
    await pushAndTrackBranch();
    console.log('Done');

    console.log('Following project with Circle CI');
    await followWithCircleCI({
      project: repoName,
      token: circleToken,
      userOrOrgName: githubAccountName,
    });
    console.log('Done');

    if (!(await exists('.editorconfig'))) {
      d('creating .editorconfig');
      await template('.editorconfig', {});

      d('committing .editorconfig');
      await addAndCommit(
        ['.editorconfig'],
        'build(tooling): add .editorconfig'
      );
    }

    await scaffold({
      github,
      githubUserObject,
      license,
      org: githubAccountName,
      orgName: githubDisplayName,
      packageName,
      remoteRepo,
      repoName,
    });

    console.log('Pushing all changes to GitHub');
    await exec('git push');
    console.log('Pushed all changes to GitHub');

    console.log('Enforcing branch protection');
    await github.repos.updateBranchProtection({
      branch: 'master',
      enforce_admins: true,
      owner: githubAccountName,
      repo: repoName,
      required_pull_request_reviews: null,
      required_status_checks: {
        contexts: ['ci/circleci: lint', 'ci/circleci: test'],
        strict: true,
      },
      restrictions: null,
    });

    console.log('Following project with dependabot');
    try {
      await follow(
        {
          githubRepoObject: remoteRepo,
          githubUserObject,
        },
        github
      );
      console.log('Done');
    } catch (err) {
      console.error('Failed to follow project with dependabot');
      console.error(err);
    }

    console.log();
    console.log('Your project can be viewed at the following urls');
    if (remoteRepo) {
      console.log('GitHub:');
      console.log(`  ${remoteRepo.html_url}`);

      console.log('CircleCI:');
      console.log(`  https://circleci.com/gh/${githubAccountName}/${repoName}`);
    }

    console.log();
  } catch (err) {
    console.error(err);
    throw err;
  }
}
module.exports = create;

/* eslint-enable complexity */
