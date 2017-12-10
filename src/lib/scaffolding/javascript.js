'use strict';

// FIXME document
/* eslint-disable require-jsdoc */

// FIXME split into functions
/* eslint-disable max-statements */

const {
  has, set, wrap
} = require('lodash');
const {readFile, writeFile} = require('mz/fs');
const {pkgShift} = require('@ianwremmel/pkgshift');

const {exists} = require('../file');
const {addAndCommit} = require('../git');
const {npmInstallDev, npmInstallPeersOf} = require('../npm');
const {template} = require('../templating');
const {d: debug} = require('../debug')(__filename);

const {extractPackageJSONFacts} = require('./facts');

module.exports = async function applyJavaScriptScaffolding(options, facts) {
  await setupPackageJson(options, facts);
};

async function setupPackageJson(argv, facts) {
  debug('checking if npmrc omits package-lock.json');
  const npmrc = await readFileOrEmpty('.npmrc');
  if (!npmrc.includes('package-lock')) {
    debug('adding "node_modules" to npmrc');
    await writeFile('.npmrc', `package-lock=false\n${npmrc}`);
  }

  if (!await exists('package.json')) {
    debug('creating initial package.json');
    await template('package.json', extractPackageJSONFacts(facts));
  }

  // Set up common transformations
  // eslint-disable-next-line func-style
  let tx = (pkg) => {
    debug('checking for engines.node');
    if (!has(pkg, 'engines.node')) {
      debug('setting for engines.node');
      set(pkg, 'engines.node', `>=${facts.engine}`);
    }

    return pkg;
  };

  debug('installing common dev dependencies');
  await npmInstallDev([
    '@commitlint/cli',
    '@commitlint/config-angular',
    '@ianwremmel/eslint-config-standard',
    'chai',
    'dependency-check',
    'eslint',
    'husky',
    'lint-staged',
    'mocha',
    'semantic-release@next'
  ]);
  debug('installing eslint config peer dependencies');
  await npmInstallPeersOf('@ianwremmel/eslint-config-standard');

  tx = wrap(tx, (fn, p, shift) => Promise.resolve(fn(p, shift))
    // eslint-disable-next-line complexity
    .then((pkg) => {
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'commitmsg',
          to: 'npm run --silent lint:commitmsg'
        });
      }
      catch (err) {
        console.warn('Could not set script "commitmsg"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint',
          to: 'npm run --silent lint:js && npm run --silent lint:changelog && npm run --silent lint:deps'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:changelog',
          to: 'commitlint --from origin/master --to HEAD'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:changelog"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:commitmsg',
          to: 'commitlint -e'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:commitmsg"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:eslint',
          to: 'eslint --ignore --ignore-path .gitignore'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:eslint"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:js',
          to: 'npm run --silent lint:eslint -- .'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:js"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:deps',
          to: 'npm run --silent lint:deps:missing && npm run --silent lint:deps:unused'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:deps"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:deps:missing',
          to: 'dependency-check package.json'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:deps:missing"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:deps:unused',
          to: 'dependency-check package.json --unused --no-dev'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:deps:unused"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'lint:staged',
          to: 'lint-staged'
        });
      }
      catch (err) {
        console.warn('Could not set script "lint:staged"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'precommit',
          to: 'npm run --silent lint:staged'
        });
      }
      catch (err) {
        console.warn('Could not set script "precommit"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'test',
          to: "mocha $(npm run --silent mocha-reporter-options) './src/**/*-spec.js'"
        });
      }
      catch (err) {
        console.warn('Could not set script "test"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'mocha-reporter-options',
          // Not actually a template curly
          // eslint-disable-next-line no-template-curly-in-string
          to: "[ -n \"${CI}\" ] && echo '--reporter xunit --reporter-options output=reports/junit/mocha.xml'"
        });
      }
      catch (err) {
        console.warn('Could not set script "mocha-reporter-options"');
        console.warn(err);
      }
      try {
        shift.api.setOrReplaceScript(pkg, {
          name: 'semantic-release',
          to: 'semantic-release pre && npm publish && semantic-release post'
        });
      }
      catch (err) {
        console.warn('Could not set script "semantic-release"');
        console.warn(err);
      }
      return pkg;
    }));

  if (!await exists('.eslintrc.yml')) {
    await template('.eslintrc.yml');
    await addAndCommit([
      '.eslintrc.yml'
    ], 'build(eslint): add eslint config');
  }

  if (!await exists('commitlint.config.js')) {
    await template('commitlint.config.js');
    await addAndCommit([
      'commitlint.config.js'
    ], 'ci(commitlint): add commitlint config');
  }

  if (argv.coverage) {
    await addToGitIgnore([
      '.nyc_output',
      'coverage'
    ]);

    debug('installing code coverage depencies');
    await npmInstallDev([
      'coveralls',
      'nyc'
    ]);

    tx = wrap(tx, (fn, p, shift) => Promise.resolve(fn(p, shift))
      .then((pkg) => {
        debug('inserting nyc in front of test script');
        try {
          shift.api.setOrReplaceScript(pkg, {
            name: 'coveralls',
            to: 'nyc report --reporter=text-lcov | coveralls'
          });
        }
        catch (err) {
          console.warn('Could not set script "coveralls"');
          console.warn(err);
        }

        shift.api.setOrReplaceScript(pkg, {
          from: /^(mocha.*?)$/,
          name: 'test',
          to: 'nyc --reporter=text $1'
        });

        debug('inserted nyc in front of test script');
        return pkg;
      }));
  }

  if (argv.circle) {
    debug('installing semantic release circle ci condition');
    await npmInstallDev([
      'condition-circle'
    ]);
    tx = wrap(tx, (fn, p, shift) => Promise.resolve(fn(p, shift))
      .then((pkg) => {
        debug('checking if package has a verifyCondition');
        if (!has(pkg, 'release.verifyConditions')) {
          debug('setting verifyCondition to condition-circle');
          set(pkg, 'release.verifyConditions', 'condition-circle');
        }
        return pkg;
      }));
  }

  tx = wrap(tx, (fn, p, shift) => Promise.resolve(fn(p, shift))
    .then((pkg) => {
      debug('Sorting package.json scripts');
      const keys = Object.keys(pkg.scripts)
        .sort();

      pkg.scripts = keys.reduce((acc, key) => {
        acc[key] = pkg.scripts[key];
        return acc;
      }, {});
      return pkg;
    }));


  let pkg = JSON.parse(await readFile('package.json'));
  pkg = await pkgShift(tx, pkg);
  await writeFile('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

  await addToGitIgnore([
    'node_modules'
  ]);

  debug('commit package.json, .npmrc, .gitignore');
  await addAndCommit([
    '.gitignore'
  ], 'build(git): update initial gitignore');
  await addAndCommit([
    '.npmrc',
    'package.json'
  ], 'build(npm): add initial package.json');
}

async function readFileOrEmpty(filename) {
  try {
    return await readFile(filename);
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

async function addToGitIgnore(ignored = []) {
  debug('reading .gitignore');
  const raw = String(await readFileOrEmpty('.gitignore'));
  const gitignore = new Set(raw.split('\n'));

  debug('adding ${ignored.join(', ') to .gitignore');
  for (const ignore of ignored) {
    gitignore.add(ignore);
  }

  debug('writing .gitignore');
  await writeFile('.gitignore', Array.from(gitignore)
    .filter(Boolean)
    .join('\n'));
}
