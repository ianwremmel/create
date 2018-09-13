'use strict';

const request = require('request-promise-native');
// eslint-disable-next-line no-unused-vars
const GitHub = require('@octokit/rest');

const {d: debug} = require('./debug')(__filename);

/**
 *
 * @param {Object} options
 * @param {any} options.githubUserObject
 * @param {GitHub.GetResponse|GitHub.CreateResponse} options.githubRepoObject
 * @param {GitHub} github
 */
async function follow({githubRepoObject, githubUserObject}, github) {
  debug('Creating temporary github token');
  const {
    data: {token, id: tokenId}
  } = await github.authorization.create({
    note: 'Temporary token for @ianwremmel/create',
    scopes: ['repo']
  });
  debug('Created temporary github token');
  try {
    debug('Following project with dependabot');
    await request({
      body: {
        'account-id': githubUserObject.id,
        'account-type': 'user',
        'automerge-rule-development-deps': 'minor',
        'automerge-rule-runtime-deps': 'minor',
        directory: '/',
        'package-manager': 'npm_and_yarn',
        'repo-id': githubRepoObject.id,
        'update-schedule': 'daily'
      },
      headers: {
        Authorization: `Personal ${token}`
      },
      json: true,
      method: 'POST',
      url: 'https://api.dependabot.com/update_configs'
    });
    debug('Followed project with dependabot');
  } finally {
    debug('Removing temporary github token');
    await github.authorization.delete({
      // eslint-disable-next-line camelcase
      authorization_id: String(tokenId)
    });
    debug('Removed temporary github token');
  }
}

exports.follow = follow;
