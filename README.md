# @ianwremmel/proj

[![license](https://img.shields.io/github/license/ianwremmel/proj.svg)](https://github.com/ianwremmel/proj/blob/master/LICENSE)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

[![Dependabot badge](https://img.shields.io/badge/Dependabot-active-brightgreen.svg)](https://dependabot.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[![CircleCI](https://circleci.com/gh/ianwremmel/proj.svg?style=svg)](https://circleci.com/gh/ianwremmel/proj)

> Rig up projects on GitHub/CircleCI

I got tired of going through the same set of steps to create a repo, tweak
package.json, connect circle ci, and whatnot, so, this automates that process
according to my preferences.

## Install

> Since this project is intended for use with `npm init`, there's generally no
> need to install it.

1. (optional) Install the
   [1Password CLI](https://1password.com/downloads/command-line/) to
   (potentiall) avoid some password prompts.
1. Use with npm init

    ```bash
    npm install -g @ianwremmel/create
    ```

## Usage

In order to avoid some password prompts, `create` attempts to pull credentials
from 1Password. You'll need to set:

-   a 1Password `login` for `github.com` (2-Factor Auth is supported)
-   a 1Password `password` for `Circle CI API Token`

> If you don't set these values, you'll be prompted for them at runtime. Due to
> timing effects, you may be prompted for multiple GitHub OTPs.

Use just like `npm init`

> If you're relying on 1Password, make sure to run `eval $(op signin my)` first.

```bash
npm init @ianwremmel
```

You'll be prompted for a few decisions and then the script will do (at least)
the following:

-   create a github repository
-   initialize local repository
-   create root commit
-   connect local repo to github repo
-   follow project on circle ci and configure project settings
-   create common project files and install dev dependencies
    -   .circleci/config.yml
    -   .editorconfig
    -   .eslintrc.yml
    -   .gitignore
    -   .markdownlint
    -   .prettierrc
    -   .prettierignore
    -   .npmrc
    -   LICENSE
    -   README.md
    -   commitlint.config.js
    -   package.json
-   generate npm scripts
-   push local commits to github
-   setup branch protection
-   Follow project with dependabot

> This project is _supposed_ to be idempotent, but rerunning in an existing
> project is not well tested. Use at your own risk.

## Maintainers

[ianwremmel](https://github.com/ianwremmel)

## Contribute

See [CONTRIBUTE](CONTRIBUTE.md)

## License

&copy; [MIT](LICENSE)
