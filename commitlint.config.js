'use strict';

// greenkeeper still uses the old commit message syntax, so we can't lint those
// commits just yet
if (process.env.CIRCLE_BRANCH && process.env.CIRCLE_BRANCH.includes('greenkeeper')) {
  module.exports = {};
}
else {
  module.exports = {
    extends: [
      '@commitlint/config-angular'
    ]
  };
}
