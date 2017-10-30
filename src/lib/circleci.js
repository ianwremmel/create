'use strict';

/* eslint-disable class-methods-use-this */

const request = require('request-promise-native');

const netrc = require('./netrc');

const CIRCLECI_API_BASE = 'https://circleci.com/api/v1.1';
/**
 * Circle CI Client
 */
class CircleCI {
  /**
   * Constructor. Loads credentials from netrc
   */
  constructor() {
    const token = netrc.host('circleci.com').login;
    require('assert')(token);
  }

  /**
   * Main network requester
   *
   * @param {Object} options -
   * @returns {Promise<Object>} -
   */
  _request(options) {
    const payload = Object.assign({
      json: true,
      qs: {'circle-token': netrc.host('circleci.com').login}
    }, options);
    payload.uri = `${CIRCLECI_API_BASE}${payload.uri}`;
    return request(payload);
  }

  /**
   * Provides information about the signed in user.
   * @returns {Promise<Object>} - User
   */
  getUser() {
    return this._request({
      method: 'GET',
      uri: '/me'
    });
  }

  /**
   * Gets details about a project
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise<Object>} -
   */
  getProject({project, username}) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}`
    });
  }

  /**
   * List of all the projects you're following on CircleCI, with build
   * information organized by branch.
   * @returns {Promise<Array>} - Projects
   */
  listProjects() {
    return this._request({
      method: 'GET',
      uri: '/projects'
    });
  }

  /**
   * Follow a new project on CircleCI.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise<Object>} -
   */
  follow({project, username}) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/follow`
    });
  }

  /**
   * Build summary for each of the last 30 builds for a single git repo.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise} -
   */
  listBuilds({project, username}) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}`
    });
  }

  /**
   * Build summary for each of the last 30 recent builds, ordered by
   * buildNumber.
   * @returns {Promise} -
   */
  listRecentBuilds() {
    return this._request({
      method: 'GET',
      uri: '/recent-builds'
    });
  }

  /**
   * ll details for a single build. The response includes all of the fields from
   * the build summary. This is also the payload for the notification webhooks,
   * in which case this object is the value to a key named ‘payload’.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  getBuild({
    buildNumber, project, username
  }) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}/${buildNumber}`
    });
  }

  /**
   * List the artifacts produced by a given build.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  getArtifacts({
    buildNumber, project, username
  }) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}/${buildNumber}/artifacts`
    });
  }

  /**
   * Retries the build, returns a summary of the new build.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  retryBuild({
    buildNumber, project, username
  }) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/${buildNumber}/retry`
    });
  }

  /**
   * Cancels the build, returns a summary of the build.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  cancelBuild({
    buildNumber, project, username
  }) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/${buildNumber}/cancel`
    });
  }

  /**
   * Adds a user to the build's SSH permissions.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  addUser({
    buildNumber, project, username
  }) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/${buildNumber}/ssh-users`
    });
  }

  /**
   * iggers a new build, returns a summary of the build. Optional build
   * parameters can be set as well.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.buildNumber -
   * @returns {Promise} -
   */
  build({
    branch, project, username
  }) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/tree/${branch}`
    });
  }

  /**
   * Create an ssh key used to access external systems that require SSH
   * key-based authentication
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise} -
   */
  createSshKey({project, username}) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/ssh-key`
    });
  }

  /**
   * Lists checkout keys.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise} -
   */
  listCheckoutKeys({project, username}) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}/checkout-key`
    });
  }

  /**
   * Create a new checkout key.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise} -
   */
  createCheckoutKey({project, username}) {
    return this._request({
      method: 'POST',
      uri: `/project/github/${username}/${project}/checkout-key`
    });
  }

  /**
   * Get a checkout key.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.fingerprint -
   * @returns {Promise} -
   */
  getCheckoutKey({
    fingerprint, project, username
  }) {
    return this._request({
      method: 'GET',
      uri: `/project/github/${username}/${project}/checkout-key/${fingerprint}`
    });
  }

  /**
   * Delete a checkout key.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {string} options.fingerprint -
   * @returns {Promise} -
   */
  deleteCheckoutKey({
    fingerprint, project, username
  }) {
    return this._request({
      method: 'DELETE',
      uri: `/project/github/${username}/${project}/checkout-key/${fingerprint}`
    });
  }

  /**
   * Clears the cache for a project.
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @returns {Promise} -
   */
  clearCache({project, username}) {
    return this._request({
      method: 'DELETE',
      uri: `/project/github/${username}/${project}/build-cache`
    });
  }

  /**
   * Adds your Heroku API key to CircleCI, takes apikey as form param name.
   * @param {string} apikey -
   * @returns {Promise} -
   */
  addHerokuKey(apikey) {
    return this._request({
      form: {apikey},
      method: 'POST',
      uri: '/user/heroku-key'
    });
  }

  /**
   * Apply settings
   * @param {Object} options -
   * @param {string} options.project -
   * @param {string} options.username -
   * @param {Object} options.settings -
   * @returns {Promise} -
   */
  configure({
    project, username, settings
  }) {
    return this._request({
      body: settings,
      json: true,
      method: 'PUT',
      uri: `/project/github/${username}/${project}/settings`
    });
  }
}

module.exports = CircleCI;
