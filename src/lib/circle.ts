import request from 'request-promise-native';
import {debug, format as f} from '@ianwremmel/debug';

const d = debug(__filename);
const CIRCLECI_API_BASE = 'https://circleci.com/api/v1.1';

async function circleRequest({
  method,
  path,
  token,
  body,
}: CircleRequestOptions) {
  const payload = {
    body,
    json: true,
    method,
    qs: {
      'circle-token': token,
    },
    uri: `${CIRCLECI_API_BASE}${path}`,
  };
  return request(payload);
}

async function follow({project, token, userOrOrgName}: FollowOptions) {
  return circleRequest({
    method: 'POST',
    path: `/project/github/${userOrOrgName}/${project}/follow`,
    token,
  });
}
async function configure({
  project,
  token,
  userOrOrgName,
  settings,
}: ConfigOptions) {
  return circleRequest({
    body: settings,
    method: 'PUT',
    path: `/project/github/${userOrOrgName}/${project}/settings`,
    token,
  });
}

export async function followWithCircleCI(options: FollowOptions) {
  d(
    f`Following project ${options.userOrOrgName}/${
      options.project
    } on Circle CI`
  );

  try {
    await follow(options);
  } catch (err) {
    console.error(err);
    d('Failed to follow project. Waiting 10 seconds and trying again.');
    await new Promise((resolve) => setTimeout(resolve, 10000));
    try {
      await follow(options);
    } catch (err2) {
      console.error(err2.message);
      d('Failed to follow project. Waiting 10 seconds and trying again.');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      try {
        await follow(options);
      } catch (err3) {
        console.error(err3.message);
        d(
          'Failed to follow project after three attempts. You should manually follow this project on Circle CI.'
        );
        return;
      }
    }
    d('Done');
  }

  d(
    'Enabling autocancel builds, build fork PRs, and disabling secrets on fork PRs'
  );
  try {
    await configure({
      settings: {
        feature_flags: {
          'autocancel-builds': true,
          'build-fork-prs': true,
          'forks-receive-secret-env-vars': false,
        },
      },
      ...options,
    });
  } catch (err) {
    d('Failed to fully configure Circle CI');
    console.error(err.message);
  }
}

interface FollowOptions {
  project: string;
  userOrOrgName: string;
  token: string;
}

interface ConfigOptions extends FollowOptions {
  settings: {
    // eslint-disable-next-line camelcase
    feature_flags: {
      'autocancel-builds': boolean;
      'build-fork-prs': boolean;
      'forks-receive-secret-env-vars': boolean;
    };
  };
}

interface CircleRequestOptions {
  method: string;
  path: string;
  token: string;
  body?: Object;
}
