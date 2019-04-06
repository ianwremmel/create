const request = require('request-promise-native');
// eslint-disable-next-line no-unused-vars
const GitHub = require('@octokit/rest');
const d = require('@ianwremmel/debug').debug(__filename);

/**
 *
 * @param {Object} options
 * @param {any} options.githubUserObject
 * @param {GitHub.ReposGetResponse|GitHub.ReposCreateForAuthenticatedUserResponse|GitHub.ReposCreateInOrgResponse} options.githubRepoObject
 * @param {GitHub} github
 */
async function follow({githubRepoObject, githubUserObject}, github) {
  d('Creating temporary github token');
  const {
    data: {token, id: tokenId},
  } = await github.oauthAuthorizations.createAuthorization({
    note:
      'Temporary token for @ianwremmel/create to call CircleCI. If you are not current running the create script, you can delete this token.',
    scopes: ['repo'],
  });
  d('Created temporary github token');
  try {
    d('Following project with dependabot');
    await request({
      body: {
        'account-id': githubUserObject.id,
        'account-type': 'user',
        'automerge-rule-development-deps': 'in_range',
        'automerge-rule-runtime-deps': 'in_range',
        directory: '/',
        'package-manager': 'npm_and_yarn',
        'repo-id': githubRepoObject.id,
        'update-schedule': 'daily',
      },
      headers: {
        Authorization: `Personal ${token}`,
      },
      json: true,
      method: 'POST',
      url: 'https://api.dependabot.com/update_configs',
    });
    d('Followed project with dependabot');
  } finally {
    d('Removing temporary github token');
    await github.oauthAuthorizations.deleteAuthorization({
      // eslint-disable-next-line camelcase
      authorization_id: tokenId,
    });
    d('Removed temporary github token');
  }
}

exports.follow = follow;
