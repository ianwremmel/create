import {execSync} from 'child_process';

import Octokit from '@octokit/rest';
import * as inquirer from 'inquirer';
import {debug, format as f} from '@ianwremmel/debug';

console.log(Octokit);

const d = debug(__filename);

function opTryGetValue(key: string) {
  try {
    const res = execSync('op get item github.com')
      .toString()
      .trim();
    const data = JSON.parse(res);
    return data.details.fields.find(
      ({name}: Record<string, string>) => name === key
    ).value;
  } catch (err) {
    return '';
  }
}

export async function init(): Promise<Octokit> {
  if (process.env.GH_TOKEN) {
    return new Octokit({
      auth: process.env.GH_TOKEN,
    });
  }

  const {username, password} = await inquirer.prompt([
    {
      default: opTryGetValue('username'),
      message: 'GitHub Username',
      name: 'username',
    },
    {
      default: opTryGetValue('password'),
      message: 'GitHub Password',
      name: 'password',
      type: 'password',
    },
  ]);

  const octokit = new Octokit({
    auth: {
      async on2fa() {
        try {
          d('attempting to use 1Password CLI to retrieve OTP');
          const otp = execSync('op get totp github.com')
            .toString()
            .trim();
          if (!otp) {
            throw new Error('1Password returned an empty OTP');
          }
          d('got OTP from 1Password');
          return otp;
        } catch (err) {
          d('failed to retrieve OTP via 1Password CLI. Falling back to prompt');
          const {otp} = await inquirer.prompt({
            message: 'GitHub OTP',
            name: 'otp',
          });
          return otp;
        }
      },
      password,
      username,
    },
  });

  octokit.hook.error('request', async (error, options) => {
    if (error.status === 401) {
      delete options.headers['x-github-otp'];
    } else {
      throw error;
    }
  });

  return octokit;
}
