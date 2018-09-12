'use strict';

const {has, set, wrap} = require('lodash');
const {exists, readFile, writeFile} = require('mz/fs');
const {pkgShift} = require('@ianwremmel/pkgshift');
// eslint-disable-next-line no-unused-vars
const GitHubAPI = require('@octokit/rest');

const {d: debug} = require('./lib/debug')(__filename);
const {template} = require('./lib/templating');
const {addAndCommit} = require('./lib/git');
const {npmInstallDev, npmInstallPeersOf} = require('./lib/npm');

/**
 *
 * @param {Object} options
 * @param {any} options.githubUserObject
 * @param {string} options.packageName
 * @param {string} options.repoName
 * @param {GitHubAPI.GetResponse|GitHubAPI.CreateResponse} options.remoteRepo
 * @param {GitHubAPI} github
 */
async function scaffold(
  {githubUserObject, remoteRepo, repoName, packageName},
  github
) {
  if (!(await exists('README.md'))) {
    debug('creating README.md');

    template('README.md', {
      githubDisplayName: githubUserObject.name,
      githubRepoName: repoName,
      githubUserName: githubUserObject.login,
      javascript: true,
      license: 'MIT',
      packageName,
      shortDescription: ''
    });

    if (!(await exists('LICENSE'))) {
      debug('creating LICENSE');

      await template('LICENSE', {
        licenseHolderDisplayName: githubUserObject.name
      });

      debug('committing LICENSE');
      await addAndCommit(['LICENSE'], 'docs(readme): add LICENSE');
    }

    debug('committing README.md');
    await addAndCommit(['README.md'], 'docs(readme): add README');
  }

  debug('checking if npmrc omits package-lock.json');
  const npmrc = await readFileOrEmpty('.npmrc');
  if (!npmrc.includes('package-lock')) {
    debug('disabled package-lock.json via .npmrc');
    await writeFile('.npmrc', `package-lock=false\n${npmrc}`);
  }

  const {data: githubPublicEmails} = await github.users.getPublicEmails({});

  const githubPublicEmail = (
    githubPublicEmails.find(({primary}) => primary) || githubPublicEmails[0]
  ).email;

  if (!(await exists('package.json'))) {
    debug('creating initial package.json');
    await template('package.json', {
      authorEmail: githubPublicEmail,
      authorName: githubUserObject.name,
      name: repoName,
      packageName,
      repository: remoteRepo.git_url,
      shortDescription: ''
    });
  }

  // eslint-disable-next-line func-style
  let tx = (pkg) => {
    debug('checking for engines.node');
    if (!has(pkg, 'engines.node')) {
      debug('setting for engines.node');
      set(pkg, 'engines.node', `>=${10}`);
    }

    return pkg;
  };

  debug('installing common dev dependencies');
  await npmInstallDev([
    '@commitlint/cli',
    '@commitlint/config-conventional',
    '@ianwremmel/eslint-plugin-ianwremmel',
    'eslint',
    'husky',
    'lint-staged',
    'semantic-release'
  ]);
  debug('installing eslint config peer dependencies');
  await npmInstallPeersOf('@ianwremmel/eslint-plugin-ianwremmel');

  tx = wrap(tx, (fn, p, shift) =>
    Promise.resolve(fn(p, shift))
      // eslint-disable-next-line complexity
      .then((pkg) => {
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'commitmsg',
            to: 'commitlint -e'
          });
        } catch (err) {
          console.warn('Could not set script "commitmsg"');
          console.warn(err);
        }
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'lint',
            to: 'npm-run-all lint:*'
          });
        } catch (err) {
          console.warn('Could not set script "lint"');
          console.warn(err);
        }
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'lint:changelog',
            to: 'commitlint --from origin/master --to HEAD'
          });
        } catch (err) {
          console.warn('Could not set script "lint:changelog"');
          console.warn(err);
        }
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'eslint',
            to: 'eslint --ignore --ignore-path .gitignore'
          });
        } catch (err) {
          console.warn('Could not set script "lint:eslint"');
          console.warn(err);
        }
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'lint:js',
            to: 'npm run --silent eslint -- .'
          });
        } catch (err) {
          console.warn('Could not set script "lint:js"');
          console.warn(err);
        }

        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'precommit',
            to: 'lint-staged'
          });
        } catch (err) {
          console.warn('Could not set script "precommit"');
          console.warn(err);
        }
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'test',
            to: "echo 'no tests specified'; exit 1"
          });
        } catch (err) {
          console.warn('Could not set script "test"');
          console.warn(err);
        }

        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'semantic-release',
            to: 'semantic-release'
          });
        } catch (err) {
          console.warn('Could not set script "semantic-release"');
          console.warn(err);
        }
        return pkg;
      })
  );

  if (!(await exists('.eslintrc.yml'))) {
    await template('.eslintrc.yml');
    await addAndCommit(['.eslintrc.yml'], 'build(eslint): add eslint config');
  }

  if (!(await exists('commitlint.config.js'))) {
    await template('commitlint.config.js');
    await addAndCommit(
      ['commitlint.config.js'],
      'ci(commitlint): add commitlint config'
    );
  }

  debug('installing semantic release circle ci condition');
  await npmInstallDev(['condition-circle']);
  tx = wrap(tx, (fn, p, shift) =>
    Promise.resolve(fn(p, shift)).then((pkg) => {
      debug('checking if package has a verifyCondition');
      if (!has(pkg, 'release.verifyConditions')) {
        debug('setting verifyCondition to condition-circle');
        set(pkg, 'release.verifyConditions', 'condition-circle');
      }
      return pkg;
    })
  );

  tx = wrap(tx, (fn, p, shift) =>
    Promise.resolve(fn(p, shift)).then((pkg) => {
      debug('Sorting package.json scripts');
      const keys = Object.keys(pkg.scripts).sort();

      pkg.scripts = keys.reduce((acc, key) => {
        acc[key] = pkg.scripts[key];
        return acc;
      }, {});
      return pkg;
    })
  );

  let pkg = JSON.parse(await readFile('package.json', 'utf8'));
  pkg = await pkgShift(tx, pkg);
  await writeFile('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

  await addToGitIgnore(['node_modules']);

  debug('commit package.json, .npmrc, .gitignore');
  await addAndCommit(['.gitignore'], 'build(git): update initial gitignore');
  await addAndCommit(
    ['.npmrc', 'package.json'],
    'build(npm): add initial package.json'
  );
}
exports.scaffold = scaffold;

/**
 * @param {string} filename
 * @returns {Promise<string>}
 */
async function readFileOrEmpty(filename) {
  try {
    return await readFile(filename, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

/**
 * @param {string[]} [ignored=[]]
 */
async function addToGitIgnore(ignored = []) {
  debug('reading .gitignore');
  const raw = String(await readFileOrEmpty('.gitignore'));
  const gitignore = new Set(raw.split('\n'));

  debug('adding ${ignored.join(', ') to .gitignore');
  for (const ignore of ignored) {
    gitignore.add(ignore);
  }

  debug('writing .gitignore');
  await writeFile(
    '.gitignore',
    Array.from(gitignore)
      .filter(Boolean)
      .join('\n')
  );
}
