import * as Octokit from '@octokit/rest';
import {exists, readFile, writeFile} from 'mz/fs';
import {debug} from '@ianwremmel/debug';
import {pkgShift, transformCallback, Package} from '@ianwremmel/pkgshift';

import {copy, template} from './lib/templating';
import {addAndCommit, addToGitIgnore} from './lib/git';
import {npmInstallDev, npmInstallPeersOf} from './lib/npm';

const d = debug(__filename);

export async function scaffold(options: ScaffoldOptions) {
  await configureReadmeAndLicense(options);
  await initializePackage(options);
  await initializeGitIgnore();
  // commitlint and lint-staged needs to come before husky because the husky
  // hooks are set in the package.json template
  await configureLintStaged();
  await configureCommitlint();
  await configureHusky();
  await configureEslintAndPrettier();
  await configureCircleCi();
  // Do sem rel last so it's easy to git reset it to remove it
  await configureSemanticRelease();
}

export interface ScaffoldOptions {
  license: 'MIT' | 'UNLICENSED';
  // @octokit/rest defines this as an any :(
  githubUserObject: any;
  packageName: string;
  remoteRepo:
    | Octokit.ReposGetResponse
    | Octokit.ReposCreateForAuthenticatedUserResponse
    | Octokit.ReposCreateInOrgResponse;
  repoName: string;
  org: string;
  orgName: string;
  github: Octokit;
}

async function configureReadmeAndLicense({
  license,
  githubUserObject,
  orgName,
  repoName,
  org,
  packageName,
}: ScaffoldOptions) {
  if (!(await exists('README.md'))) {
    d('creating README.md');

    template('README.md', {
      githubDisplayName: githubUserObject.name,
      githubOrgName: orgName,
      githubRepoName: repoName,
      githubUserName: githubUserObject.login,
      javascript: true,
      license,
      org,
      packageName,
      shortDescription: '',
    });

    d('committing README.md');
    await addAndCommit(['README.md'], 'docs(readme): add README');
  }

  if (license === 'MIT' && !(await exists('LICENSE'))) {
    d('creating LICENSE');

    await template('LICENSE', {
      licenseHolderDisplayName: orgName || githubUserObject.name,
    });

    d('committing LICENSE');
    await addAndCommit(['LICENSE'], 'docs(readme): add LICENSE');
  }
}

async function initializePackage({
  githubUserObject,
  github,
  packageName,
  remoteRepo,
  repoName,
}: ScaffoldOptions): Promise<void> {
  const {data: githubPublicEmails} = await github.users.listPublicEmails({});

  const githubPublicEmail = (
    githubPublicEmails.find(({primary}) => primary) || githubPublicEmails[0]
  ).email;

  if (!(await exists('package.json'))) {
    d('creating initial package.json');
    await template('package.json', {
      authorEmail: githubPublicEmail,
      authorName: githubUserObject.name,
      name: repoName,
      packageName,
      repository: remoteRepo.git_url,
      shortDescription: '',
    });
  }

  await transformPackage((pkg, {api}) => {
    d('checking for engines.node');
    if (!pkg.engines || !pkg.engines.node) {
      d('setting engines.node');
      pkg.engines = pkg.engines || {};
      pkg.engines.node = '>=10';
    }

    d('adding default scripts');
    api.setOrReplaceScript(pkg, {
      name: 'lint',
      to: 'npm-run-all lint:*',
    });

    api.setOrReplaceScript(pkg, {
      name: 'build',
      to: 'npm-run-all build:*',
    });

    api.setOrReplaceScript(pkg, {
      name: 'build:readme',
      to:
        "markdown-toc -i --bullets='-' --maxdepth=3  README.md  && prettier --write README.md",
    });

    api.setOrReplaceScript(pkg, {
      name: 'test',
      to: "echo 'no tests specified'; exit 1",
    });

    return pkg;
  });

  await npmInstallDev(['markdown-toc', 'npm-run-all']);

  await addAndCommit(['package.json'], 'chore: add initial package.json');
}

async function initializeGitIgnore(): Promise<void> {
  await addToGitIgnore(['node_modules', 'reports']);
  await addAndCommit(['.gitignore'], 'chore: add initial .gitignore');
}

async function configureHusky(): Promise<void> {
  d('installing husky');
  await npmInstallDev(['husky']);
  await addAndCommit(['package.json'], 'chore: add husky');
}

async function configureLintStaged(): Promise<void> {
  d('installing lint-staged');
  await npmInstallDev(['lint-staged']);
  await transformPackage((pkg) => {
    pkg['lint-staged'] = pkg['lint-staged'] || {};
    return pkg;
  });
  await addAndCommit(['package.json'], 'chore: add lint-staged');
}

async function configureEslintAndPrettier(): Promise<void> {
  d('installing eslint and peers');
  await npmInstallDev(['@ianwremmel/eslint-plugin-ianwremmel', 'eslint']);
  d('installing eslint config peer dependencies');
  await npmInstallPeersOf('@ianwremmel/eslint-plugin-ianwremmel');

  const files = [];
  if (!(await exists('.markdownlint.json'))) {
    await copy('.markdownlint.json');
    files.push('.markdownlint.json');
  }
  if (!(await exists('.prettierrc'))) {
    await copy('.prettierrc');
    files.push('.prettierrc');
  }

  if (!(await exists('.eslintrc.yml'))) {
    await template('.eslintrc.yml');
  }

  await addAndCommit(['.eslintrc.yml'], 'chore: add eslint config');

  await transformPackage((pkg, {api}) => {
    api.setOrReplaceScript(pkg, {
      name: 'eslint',
      to: 'eslint --ignore --ignore-path .gitignore',
    });

    api.setOrReplaceScript(pkg, {
      name: 'lint:js',
      to: 'npm run --silent eslint -- .',
    });

    // TODO duplicate this line for ts in the ts section
    // TODO create a .vscode/settings.json that adds typescript to the vscode
    // linter list
    addStringOrArray(pkg['lint-staged'], '*.js', 'npm run eslint -- ');
    addStringOrArray(pkg['lint-staged'], 'bin/**', 'npm run eslint -- ');

    return pkg;
  });
  files.push('package.json');

  await addAndCommit(files, 'chore: configure eslint and prettier');
}

async function configureCommitlint(): Promise<void> {
  await npmInstallDev(['@commitlint/cli', '@commitlint/config-conventional']);

  await transformPackage((pkg, {api}) => {
    api.setOrReplaceScript(pkg, {
      name: 'lint:changelog',
      to: 'commitlint --from origin/master --to HEAD',
    });
    return pkg;
  });

  if (!(await exists('commitlint.config.js'))) {
    await template('commitlint.config.js');
    await addAndCommit(['commitlint.config.js'], 'chore: add commitlint');
  }
}

async function configureSemanticRelease(): Promise<void> {
  await npmInstallDev(['condition-circle', 'semantic-release']);

  await transformPackage((pkg, {api}) => {
    api.setOrReplaceScript(pkg, {
      name: 'semantic-release',
      to: 'semantic-release',
    });

    pkg.release = pkg.release || {};
    if (
      !pkg.release.verifyConditions ||
      !(
        pkg.release.verifyConditions === 'condition-circle' ||
        pkg.release.verifyConditions.includes('condition-circle')
      )
    ) {
      addStringOrArray(pkg.release, 'verifyConditions', 'condition-circle');
    }
    return pkg;
  });

  await addAndCommit(['package.json'], 'chore: configure semantic-release');
}

async function configureCircleCi(): Promise<void> {
  d('checking of circle config exists');
  if (!(await exists('.circleci/config.yml'))) {
    d('circle config does not exist, creating it');
    await copy('.circleci/config.yml');
    await addAndCommit(
      ['.circleci/config.yml'],
      'ci(circle): create circle config'
    );
  }
}

// helpers

function addStringOrArray(
  obj: Record<string, string | string[]>,
  key: string,
  str: string
) {
  // need to grab a reference to get TSC to detect things properly. `obj[key]`
  // can't be type-narrowed
  const arrOrString = obj[key];

  if (Array.isArray(arrOrString)) {
    arrOrString.push(str);
  } else if (arrOrString) {
    obj[key] = [arrOrString, str];
  } else {
    obj[key] = str;
  }
  return obj;
}

async function transformPackage(tx: transformCallback): Promise<void> {
  let pkg = JSON.parse(await readFile('package.json', 'utf8'));
  pkg = await pkgShift(tx, pkg);
  pkg = await pkgShift(txSortScripts, pkg);
  await writeFile('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

async function txSortScripts(pkg: Package): Promise<Package> {
  const {scripts} = pkg;
  if (!scripts) {
    return pkg;
  }

  d('Sorting package.json scripts');
  const keys = Object.keys(scripts).sort();

  const result: Record<string, string> = {};

  pkg.scripts = keys.reduce((acc, key) => {
    acc[key] = scripts[key];
    return acc;
  }, result);

  return pkg;
}
