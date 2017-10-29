'use strict';

const debug = require(`debug`)(`proj:lib:github`);
const GitHubAPI = require(`github`);

const {getGithubDetailsFromRepo} = require(`./git`);

const github = new GitHubAPI();
github.authenticate({type: `netrc`});

module.exports = github;

github.getOrCreateRepo = async function getOrCreateRepo(details) {
  try {
    debug(`Creating github repo`);
    const githubRepo = (await github.repos.create(details)).data;
    debug(`Done`);
    return githubRepo;
  }
  catch (err) {
    // 422 probably implies we've already got a repo by that name, so, assume
    // this is the same repo.
    if (err.code !== 422) {
      throw err;
    }
    debug(`Project already seems to exist on GitHub`);
    debug(`Fetching GitHub repo details`);
    let repoDetails;
    try {
      debug(`Attempting to get origin details from repo`);
      repoDetails = await getGithubDetailsFromRepo();
      debug(`Done`);
    }
    catch (err2) {
      debug(`Repo doesn't have origin details, falling back to options passed to script`);
      repoDetails = {
        owner: details.owner,
        repo: details.name
      };
    }
    const githubRepo = (await github.repos.get(repoDetails)).data;
    debug(`Done`);
    return githubRepo;
  }

};
