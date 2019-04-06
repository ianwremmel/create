import * as inquirer from 'inquirer';
import {debug, format as f} from '@ianwremmel/debug';
import {exec} from 'mz/child_process';

import {CircleCI, followWithCircle} from './lib/circleci';
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

interface CreateArgs {
  localOnly: boolean;
  public: boolean;
  org?: string;
}

async function create(argv: CreateArgs) {
  try {
    const {license} = await inquirer.prompt({
      choices: ['MIT', 'UNLICENSED'],
      default: 'MIT',
      message: 'Select a license',
      name: 'license',
      type: 'list',
    });

    const cci = new CircleCI();

    const repoName = process
      .cwd()
      .split('/')
      .pop();
    if (!repoName) {
      throw new TypeError('This line cannot be hit');
    }

    const github = await initGitHub();

    const {data: githubUserObject} = await github.users.getAuthenticated({});

    let org, orgName;
    if (argv.org) {
      const {data: githubOrgObject} = await github.orgs.get({org: argv.org});
      org = githubOrgObject.login.toLowerCase();
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
      private: !argv.public,
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
      username: githubAccountName,
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

    if (!argv.localOnly) {
      console.log('Pushing all changes to GitHub');
      await exec('git push');
      console.log('Pushed all changes to GitHub');
    }

    if (!argv.localOnly) {
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
    }

    if (!argv.localOnly) {
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
        console.log(
          `  https://circleci.com/gh/${githubAccountName}/${repoName}`
        );
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
