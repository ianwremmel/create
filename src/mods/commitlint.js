

execSync(`npm uninstall conventional-changelog conventional-changelog-angular`);
execSync(`npm install --save-dev @commitlint/cli @commitlint/config-angular`);

const pkgPath = path.resolve(process.cwd(), `package.json`);

const pkg = JSON.parse(await readFile(pkgPath, `utf8`));

replaceScript(pkg, {
  name: `lint:changelog`,
  from: /conventional-changelog-lint (.+?)/
  to: `commitlint $1`
});

replaceScript(pkg, {
  name: `lint:commitmsg`,
  from: `conventional-changelog-lint (.+?)`
  to: `commitlint $1`
});

await writeFile(JSON.stringify(pkg, null, 2), pkgPath);
