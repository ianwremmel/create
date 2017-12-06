'use strict';

const request = require('request-promise-native');
const netrc = require('netrc');

const {d: debug, f} = require('./debug')(__filename);

exports.check = async function check(machine, testurl) {
  const config = netrc();
  const auth = config[machine];

  if (!auth) {
    debug(f`auth missing for ${machine}`);
    throw new Error(`please configure netrc for ${machine}`);
  }

  try {
    debug(f`verifying creds for ${machine}`);
    const opts = {
      auth: {
        pass: auth.password,
        sendImmediately: true,
        user: auth.login
      },
      headers: {'user-agent': 'request-promise-native'},
      url: testurl
    };
    await request(opts);
    debug(f`verified creds for ${machine}`);
  }
  catch (err) {
    debug(err.message);
    debug(f`request to ${machine} failed; please re-invoke with the corresponding command line switches`);
  }
};

exports.host = function host(machine) {
  const config = netrc();
  const auth = config[machine];
  return Object.assign({}, auth);
};
