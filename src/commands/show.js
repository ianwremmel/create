'use strict';

/* eslint-disable max-statements */


const debug = require(`debug`)(`proj:command:show`);

const util = require(`util`);

const CircleCI = require(`../lib/circleci`);
const github = require(`../lib/github`);
const netrc = require(`../lib/netrc`);
const {getGithubDetailsFromRepo} = require(`../lib/git`);

module.exports = {
  builder: {},
  command: `show`,
  desc: `Show interesting details about this project`,
  async handler(context) {
    await netrc.check(`circleci.com`, `https://circleci.com/api/v1.1/me`, context);
    await netrc.check(`api.github.com`, `https://api.github.com/user`, context);

    const cci = new CircleCI();

    const {owner, repo} = await getGithubDetailsFromRepo();

    const out = {
      circle: {
        project: await cci.getProject({
          project: repo,
          username: owner
        }),
        user: await cci.getUser()
      },
      github: {
        project: (await github.repos.get({
          owner,
          repo
        })).data,
        user: (await github.users.get({})).data
      }
    };

    if (context.json) {
      console.log(JSON.stringify(out, null, 2));
    }
    else {
      console.info(util.inspect(out, {depth: null}));
    }
  }
};
