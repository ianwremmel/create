'use strict';

/* eslint-disable max-statements */

const debug = require(`debug`)(`proj:command:show`);

const {execSync} = require(`child_process`);
const path = require(`path`);

const {readFile, writeFile} = require(`mz/fs`);

module.exports = {
  builder: {},
  command: `sandbox`,
  desc: `Show interesting details about this project`,
  async handler(context) {
    execSync(`npm uninstall conventional-changelog conventional-changelog-lint`);
    execSync(`npm install --save-dev @commitlint/cli @commitlint/config-angular`);

    const pkgPath = path.resolve(process.cwd(), `package.json`);

    const pkg = JSON.parse(await readFile(pkgPath, `utf8`));

    setOrReplaceScript(pkg, {
      from: /conventional-changelog-lint (.+?)/,
      name: `lint:changelog`,
      to: `commitlint $1`
    });

    setOrReplaceScript(pkg, {
      from: /conventional-changelog-lint (.+?)/,
      name: `lint:commitmsg`,
      to: `commitlint $1`
    });

    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
};


/* eslint-disable require-jsdoc */

function setOrReplaceScript(pkg, {
  from, name, to
}) {
  const script = pkg.scripts[name];
  if (!script) {
    pkg.scripts[name] = to;
    return;
  }

  if (typeof from === `string`) {
    if (!from === script) {
      console.warn(`Unexpected initial value for npm script "${name}. Please update it manually to`);
      console.warn(`the following:`);
      console.warn();
      console.warn(`  ${to}`);
      console.warn();
    }

    pkg.scripts[name] = to;
    return;
  }

  if (!from.test(script)) {
    console.warn(`Unexpected initial value for npm script "${name}. Please update it manually to`);
    console.warn(`the following:`);
    console.warn();
    console.warn(`  ${to}`);
    console.warn();
    return;
  }

  pkg.scripts[name] = script.replace(from, to);
}
