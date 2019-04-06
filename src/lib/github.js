'use strict';

const GitHub = require('@octokit/rest');
const netrc = require('netrc');

const github = new GitHub();
if (process.env.GH_TOKEN) {
  github.authenticate({
    token: process.env.GH_TOKEN,
    type: 'oauth',
  });
} else {
  const auth = netrc()['api.github.com'];
  github.authenticate({
    password: auth.password,
    type: 'basic',
    username: auth.login,
  });
}

module.exports = github;
