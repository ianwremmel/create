'use strict';

const E_UNHANDLED_REJECTION = 64;

const GitHubAPI = require('github');

const github = new GitHubAPI();

if (process.env.GH_TOKEN) {
  github.authenticate({
    token: process.env.GH_TOKEN,
    type: 'oauth'
  });
}
else {
  github.authenticate({type: 'netrc'});
}


(async function run() {
  const {data: repos} = await github.repos.getAll({
    affiliation: 'owner',
    per_page: 100,
    sort: 'created'
  });

  const interestingRepos = repos
    .filter(({name}) => name.startsWith('test-'))
    .filter(({fork}) => !fork)
    .map(({name}) => name);

  for (const repo of interestingRepos) {
    console.log(`Deleting repo ${repo}`);
    await github.repos.delete({
      owner: 'ianwremmel',
      repo
    });
    console.log(`Deleted repo ${repo}`);
  }

}());

process.on('unhandledRejection', (err) => {
  console.error(err.stack || err.toString());
  // eslint-disable-next-line no-process-exit
  process.exit(E_UNHANDLED_REJECTION);
});
