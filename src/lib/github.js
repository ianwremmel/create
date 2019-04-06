'use strict';

const GitHub = require('@octokit/rest');
const netrc = require('netrc');
const prompt = require('prompt-sync')();

if (process.env.GH_TOKEN) {
  const github = new GitHub({
    auth: process.env.GH_TOKEN,
  });
  module.exports = github;
} else {
  let {login: username, password} = netrc()['api.github.com'];

  if (!username) {
    username = prompt('GitHub Username (not stored)');
  }

  if (!password) {
    password = prompt('GitHub Password (not stored)');
  }

  const github = new GitHub({
    auth: {
      /** @returns {Promise<string>} */
      async on2fa() {
        return prompt('GitHub Two-factor Authentication Code:');
      },
      password,
      username,
    },
  });
  module.exports = github;
}
