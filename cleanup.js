const {execSync} = require('child_process');

const GitHubAPI = require('@octokit/rest');

const E_UNHANDLED_REJECTION = 64;

function opGet(key) {
  const res = execSync('op get item github.com')
    .toString()
    .trim();
  const data = JSON.parse(res);
  return data.details.fields.find(({name}) => name === key).value;
}

const github = new GitHubAPI({
  auth: {
    async on2fa() {
      const otp = execSync('op get totp github.com')
        .toString()
        .trim();
      return otp;
    },
    password: opGet('password'),
    username: opGet('username'),
  },
});

(async function run() {
  const {data: repos} = await github.repos.list({
    affiliation: 'owner',
    per_page: 100,
    sort: 'created',
  });

  const interestingRepos = repos
    .filter(({name}) => name.startsWith('test-'))
    .filter(({fork}) => !fork)
    .map(({name}) => name);

  for (const repo of interestingRepos) {
    // console.log(`will delete ${repo}`);
    console.log(`Deleting repo ${repo}`);
    await github.repos.delete({
      owner: 'ianwremmel',
      repo,
    });
    console.log(`Deleted repo ${repo}`);
  }
})();

process.on('unhandledRejection', (err) => {
  console.error(err.stack || err.toString());
  // eslint-disable-next-line no-process-exit
  process.exit(E_UNHANDLED_REJECTION);
});
