const {exec} = require('mz/child_process');

const {d: debug, f} = require('./debug')(__filename);

/**
 * Use the npm command line to install the specifed packages and save them as
 * devDependencies
 * @param {string[]} packages
 */
async function npmInstallDev(packages) {
  debug('installing dev dependencies', packages);
  await exec(`npm install --save-dev ${packages.join(' ')}`);
  debug('installed dev dependencies');
}

exports.npmInstallDev = npmInstallDev;

/**
 * Install all the peerDependencies for the specified package
 * @param {string} packageName
 */
async function npmInstallPeersOf(packageName) {
  debug(f`installing peers of ${packageName}`);
  const [out] = await exec(`npm info --json ${packageName}`);
  const info = JSON.parse(out.toString());
  await npmInstallDev(Object.keys(info.peerDependencies));
}

exports.npmInstallPeersOf = npmInstallPeersOf;
