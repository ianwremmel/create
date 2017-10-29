'use strict';

const debug = require(`debug`)(`proj:lib:git`);
const kit = require(`nodegit-kit`);
const nodegit = require(`nodegit`);

/**
 * Copy files and commit them in a group
 *
 * @param {Repository} repo -
 * @param {Object} context -
 * @param {string} message -
 * @private
 * @returns {Promise} -
 */
exports.addAndCommit = async function addAndCommit(repo, context, message) {
  const index = await repo.refreshIndex();
  await index.addAll();
  await index.write();
  await index.writeTree();
  await kit.commit(repo, {message});
  debug(`Done`);
};

/**
 * Push commits to remote repo
 * @param {Remote} remote -
 * @returns {Promise} -
 */
exports.push = async function push(remote) {
  await remote.push([
    `refs/heads/master:refs/heads/master`
  ],
  {
    callbacks: {
      certificateCheck() {
        return 1;
      },
      credentials(url, userName) {
        return nodegit.Cred.sshKeyFromAgent(userName);
      }
    }
  });
};
