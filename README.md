# @ianwremmel/proj

[![license](https://img.shields.io/github/license/ianwremmel/proj.svg)](https://github.com/ianwremmel/proj/blob/master/LICENSE)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

[![Dependabot badge](https://img.shields.io/badge/Dependabot-active-brightgreen.svg)](https://dependabot.com/)
[![dependencies Status](https://david-dm.org/ianwremmel/proj/status.svg)](https://david-dm.org/ianwremmel/proj)
[![devDependencies Status](https://david-dm.org/ianwremmel/proj/dev-status.svg)](https://david-dm.org/ianwremmel/proj?type=dev)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[![CircleCI](https://circleci.com/gh/ianwremmel/proj.svg?style=svg)](https://circleci.com/gh/ianwremmel/proj)
[![Coverage Status](https://coveralls.io/repos/github/ianwremmel/proj/badge.svg?branch=master)](https://coveralls.io/github/ianwremmel/proj?branch=master)

> Rig up projects on GitHub/CircleCI

I got tired of going through the same set of steps to create a repo, tweak
package.json, connect circle ci, and whatnot, so, this automates that process
according to my preferences.

## Install

> Since this project is intentded for use with `npm init`, there's generally no
> need to install it.

```bash
npm install -g @ianwremmel/create
```

## Usage

```bash
npm init @ianwremmel
```

Without options, the default behavior is:

-   create a github repository
-   initialize local repository
-   create root commit
-   connect local repo to github repo
-   follow project on circle ci and configure project settings
-   create common project files
    -   .editorconfig
    -   .circleci/config.yml
    -   README.md
    -   LICENSE
    -   package.json
    -   .gitignore
    -   .eslintrc.yml
    -   commitlint.config.js
    -   .npmrc
    -   .markdownlint
-   push local commits to github
-   setup branch protection
-   install dev dependendencies

## Maintainers

[ianwremmel](https://github.com/ianwremmel)

## Contribute

See [CONTRIBUTE](CONTRIBUTE.md)

## License

&copy; [MIT](LICENSE)
