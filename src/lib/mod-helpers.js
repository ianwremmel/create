'use strict';

/**
 * Replace a package.json script
 *
 * @param {Object} pkg - Package defintion to alter
 * @param {Object} config -
 * @param {string|RegEx} config.from - current script or pattern to validate
 * against before replacement
 * @param {string} config.name - script name to replace
 * @param {string} config.to - new script definition
 * @returns {undefined}
 */
exports.setOrReplaceScript = function setOrReplaceScript(pkg, {
  from, name, to
}) {
  const script = pkg.scripts[name];
  if (!script) {
    pkg.scripts[name] = to;
    return;
  }

  if (typeof from === 'string') {
    if (!from === script) {
      console.warn();
      console.warn(`Unexpected initial value for npm script "${name}". Please update it manually to`);
      console.warn('the following:');
      console.warn();
      console.warn(`  ${to}`);
      console.warn();
    }

    pkg.scripts[name] = to;
    return;
  }

  if (!from.test(script)) {
    const toPattern = new RegExp(to.replace(/\$\d/g, '.*?'));
    if (!toPattern.test(script)) {
      console.warn();
      console.warn(`Unexpected initial value for npm script "${name}". Please update it manually to`);
      console.warn('the following:');
      console.warn();
      console.warn(`  ${to}`);
      console.warn();
    }
    return;
  }

  pkg.scripts[name] = script.replace(from, to);
};
