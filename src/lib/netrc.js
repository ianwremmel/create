const request = require('request-promise-native');
const netrc = require('netrc');
const {debug, format: f} = require('@ianwremmel/debug');
const d = debug(__filename);

/**
 * Checks if the netrc for the specified machine is valid
 *
 * @param {string} machine
 * @param {string} testurl
 */
async function check(machine, testurl) {
  const config = netrc();
  const auth = config[machine];

  if (!auth) {
    d(f`auth missing for ${machine}`);
    throw new Error(`please configure netrc for ${machine}`);
  }

  try {
    d(f`verifying creds for ${machine}`);
    const opts = {
      auth: {
        pass: auth.password,
        sendImmediately: true,
        user: auth.login,
      },
      headers: {'user-agent': 'request-promise-native'},
      url: testurl,
    };
    await request(opts);
    d(f`verified creds for ${machine}`);
  } catch (err) {
    debug(err.message);
    debug(
      f`request to ${machine} failed; please re-invoke with the corresponding command line switches`
    );
  }
}
exports.check = check;

/**
 * @param {string} machine
 * @returns {Object}
 */
function host(machine) {
  const config = netrc();
  const auth = config[machine];
  return {...auth};
}
exports.host = host;
