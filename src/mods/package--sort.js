'use strict';

const path = require('path');

const {difference} = require('lodash');
const {readFile, writeFile} = require('mz/fs');

/**
 * Sort the keys in package.josn
 * @returns {Promise} -
 */
module.exports = async function sortPackage() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

  const order = [
    'name',
    'version',
    'description',
    'keywords',
    'homepage',
    'bugs',
    'license',
    'author',
    'contributors',
    'files',
    'main',
    'browser',
    'module',
    'bin',
    'man',
    'directories',
    'directories.lib',
    'directories.bin',
    'directories.man',
    'directories.doc',
    'directories.example',
    'repository',
    'scripts',
    'config',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'bundledDependencies',
    'optionalDependencies',
    'engines',
    'engineString',
    'os',
    'cpu',
    'preferGlobal',
    'private',
    'publishConfig',
    'browser',
    'browserify'
  ];

  let result = order.reduce((acc, key) => {
    acc[key] = pkg[key];
    return acc;
  }, {});

  const unknownKeys = difference(Object.keys(pkg), order);

  result = unknownKeys.reduce((acc, key) => {
    acc[key] = pkg[key];
    return acc;
  }, result);

  await writeFile(pkgPath, `${JSON.stringify(result, null, 2)}\n`);
};
