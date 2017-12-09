'use strict';

// FIXME document
/* eslint-disable require-jsdoc */

// FIXME split into functions
/* eslint-disable max-statements */

// TODO addAndCommit should accept create and update strings

// // TODO .github
// // TODO CONTRIBUTE
// // TODO ISSUE TEMPLATE
// TODO --full-defaults so we don't need to opt into every single option
// TODO update usage in main README


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
    'semantic-release'
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

  // TODO add eslintrc
  // TODO add commitlint.config.js

  if (argv.coverage) {
    // TODO gitignore: .nyc_output
    // TODO gitignore: coverage
    // TODO add coveralls badge to readme
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
          // FIXME replacer doesn't work
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

    // TODO create circle.yml
    // TODO rely on argv.engine to determine which test suites to add
  }

  let pkg = JSON.parse(await readFile('package.json'));
  pkg = await pkgShift(tx, pkg);
  await writeFile('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

  debug('checking if gitignore includes "node_modules"');
  const gitignore = await readFileOrEmpty('.gitignore');
  if (!gitignore.includes('node_modules')) {
    debug('adding "node_modules" to gitignore');
    await writeFile('.gitignore', `node_modules\n${gitignore}`);
  }

  debug('commit package.json, .npmrc, .gitignore');
  await addAndCommit([
    '.gitignore'
  ], 'build(git): add node_modules to .gitignore');
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
