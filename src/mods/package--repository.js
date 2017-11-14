'use strict';

const path = require('path');

const {readFile, writeFile} = require('mz/fs');

const {getLocalRepo} = require('../lib/git');

/**
 * Sort the keys in package.josn
 * @returns {Promise} -
 */
module.exports = async function sortPackage() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

  let {repository} = pkg;
  if (typeof repository === 'object') {
    repository = repository.url;
  }

  if (!repository.endsWith('.git')) {
    repository = undefined;
  }

  try {
    if (!repository) {
      const repo = await getLocalRepo();
      const origin = await repo.getRemote('origin');
      repository = origin.url();
    }
  }
  catch (err) {
    console.warn('could not determine repo url from local git repo');
    return;
  }

  if (repository) {
    pkg.repository = {
      type: 'git',
      url: repository
    };
  }
  else {
    console.warn('could not determine repo url from local git repo');
  }


  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
};
