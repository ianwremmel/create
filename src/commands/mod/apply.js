'use strict';

const {apply} = require('../../lib/mod');

module.exports = {
  builder(yargs) {
    return yargs.positional('mod', {
      describe: 'The mod to apply',
      type: 'string'
    });
  },
  command: 'apply <mod>',
  desc: 'Apply the specified mod',
  async handler({mod}) {
    await apply(mod, process.cwd());
  }
};


