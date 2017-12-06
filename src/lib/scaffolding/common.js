'use strict';

const {d: debug} = require('../debug')(__filename);
const {exists} = require('../file');
const {addAndCommit} = require('../git');
const {template} = require('../templating');

const {extractLicenseFacts, extractReadmeFacts} = require('./facts');

/**
 * Add common files like .editorconfig, LICENSE, and a README. The README will
 * be formatted according to
 * [standard-readme](https://github.com/RichardLitt/standard-readme).
 * @param {Object} options
 * @param {Facts} facts
 */
async function applyCommonScaffolding(options, facts) {
  if (options.editorconfig && !await exists('.editorconfig')) {
    debug('creating .editorconfig');
    await template('.editorconfig', {});

    debug('committing .editorconfig');
    await addAndCommit([
      '.editorconfig'
    ], 'build(tooling): add .editorconfig');
  }

  if (options.readme && !await exists('README.md')) {
    debug('creating README.md');

    template('README.md', extractReadmeFacts(facts));

    if (facts.license === 'MIT' && !await exists('LICENSE')) {
      debug('creating LICENSE');

      await template('LICENSE', extractLicenseFacts(facts));

      debug('committing LICENSE');
      await addAndCommit([
        'LICENSE'
      ], 'docs(readme): add LICENSE');
    }

    debug('committing README.md');
    await addAndCommit([
      'README.md'
    ], 'docs(readme): add README');
  }
}


module.exports = applyCommonScaffolding;
