'use strict';

const debug = require(`debug`)(`proj:lib:netrc`);
const request = require(`request-promise-native`);
const netrc = require(`netrc`);

/**
 * Check if we can auth against the specified testurl via netrc credentials
 * @param {string} machine -
 * @param {string} testurl -
 * @returns {Promise} -
 */
exports.check = async function check(machine, testurl) {
  const config = netrc();
  const auth = config[machine];

  if (!auth) {
    debug(`auth missing for ${machine}`);
    throw new Error(`please configure netrc for ${machine}`);
  }

  try {
    debug(`verifying creds for ${machine}`);
    const opts = {
      auth: {
        pass: auth.password,
        sendImmediately: true,
        user: auth.login
      },
      headers: {'user-agent': `request-promise-native`},
      url: testurl
    };
    await request(opts);
    debug(`verified creds for ${machine}`);
  }
  catch (err) {
    debug(err.message);
    debug(`request to ${machine} failed; please re-invoke with the corresponding command line switches`);
  }
};

/**
 * Gets the credentials for the specified machine from netrc
 * @param {string} machine -
 * @returns {Object} -
 */
exports.host = function host(machine) {
  const config = netrc();
  const auth = config[machine];
  return Object.assign({}, auth);
};
