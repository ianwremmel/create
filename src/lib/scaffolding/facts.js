'use strict';

/**
 * @typedef {Object} Facts
 * @property {Object} githubUserObject
 * @property {Object} [githubRepoObject]
 * @property {string} owner
 * @property {string} repoName
 */

/* eslint-disable require-jsdoc */

function extractCircleCommonFacts({repoName, owner}) {
  return {
    project: repoName,
    username: owner
  };
}

exports.extractCircleCommonFacts = extractCircleCommonFacts;

function extractCreateRepoFacts(facts) {
  return {
    description: facts.shortDescription,
    name: facts.repoName,
    owner: facts.githubUserObject.name,
    private: facts.private
  };
}

exports.extractCreateRepoFacts = extractCreateRepoFacts;

function extractLicenseFacts({githubUserObject}) {
  return {licenseHolderDisplayName: githubUserObject.name};
}

exports.extractLicenseFacts = extractLicenseFacts;

function extractPackageJSONFacts({
  githubUserObject, githubRepoObject, packageName, repoName, shortDescription
}) {
  return {
    authorEmail: githubUserObject.email,
    authorName: githubUserObject.name,
    name: repoName,
    packageName,
    repository: githubRepoObject.git_url,
    shortDescription
  };
}
exports.extractPackageJSONFacts = extractPackageJSONFacts;


/**
 * Extracts facts for the readme template
 * @param {Facts} facts
 * @returns {GithubReadmeFacts}
 */
function extractReadmeFacts({
  githubRepoObject, githubUserObject, javascript, license, packageName, shortDescription
}) {
  return {
    githubDisplayName: githubUserObject.name,
    githubRepoName: githubRepoObject.name,
    githubUserName: githubUserObject.login,
    javascript,
    license,
    packageName,
    shortDescription
  };
}

exports.extractReadmeFacts = extractReadmeFacts;

/* eslint-disable require-jsdoc */

/**
 * Gathers facts that'll be used through out the init script
 * @param {Object} clients
 * @param {GitHub} clients.github
 * @param {Object} argv
 * @returns {Facts}
 */
async function gatherFacts({github}, argv) {
  const repoName = argv.repoName || process.cwd()
    .split('/')
    .pop();

  const {data: githubUserObject} = await github.users.get({});

  return {
    ...argv,
    githubUserObject,
    license: argv.license.toUpperCase(),
    owner: githubUserObject.login,
    packageName: `@${githubUserObject.login}/${repoName}`,
    repoName
  };
}

exports.gatherFacts = gatherFacts;
