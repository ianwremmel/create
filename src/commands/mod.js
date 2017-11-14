'use strict';

module.exports = {
  builder(yargs) {
    return yargs
      .demandCommand(1)
      .commandDir('./mod');
  },
  command: 'mod'
};
