'use strict';

const {execSync} = require('child_process');
const path = require('path');

const debug = require('debug')('proj:mods:commitlint');
const {
  readFile, rename, writeFile
} = require('mz/fs');

const {setOrReplaceScript} = require('../lib/mod-helpers');
const {exists} = require('../lib/file');
const {template} = require('../lib/templating');

/**
 * Migrate from conventional-changelog-lint to commitlint
 * @returns {Promise} -
 */
module.exports = async function commitlint() {
  execSync('npm uninstall conventional-changelog conventional-changelog-lint');
  execSync('npm install --save-dev @commitlint/cli @commitlint/config-angular');

  const pkgPath = path.resolve(process.cwd(), 'package.json');

  debug('Loading package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  debug('Done');

  setOrReplaceScript(pkg, {
    from: /conventional-changelog-lint (.+?)/,
    name: 'lint:changelog',
    to: 'commitlint $1'
  });

  setOrReplaceScript(pkg, {
    from: /conventional-changelog-lint (.+?)/,
    name: 'lint:commitmsg',
    to: 'commitlint $1'
  });

  debug('Writing package.json');
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  debug('Done');

  debug('Checking for existing .conventional-changelog-lintrc config');
  if (await exists('.conventional-changelog-lintrc')) {
    debug('Found existing .conventional-changelog-lintrc config, renaming it to commitlint.config.js');
    await rename('.conventional-changelog-lintrc', 'commitlint.config.js');
    debug('Done');
  }
  else {
    debug('No legacy config found, checking for existing commitlint config');
    if (await exists('commitlint.config.js')) {
      debug('Found existing commitlint config');
    }
    else {
      debug('Did not find commitlint config, creating new one');
      await template('commitlint.config.js');
      debug('Done');
    }
  }
};
