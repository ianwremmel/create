'use strict';

const {list} = require('../../lib/mod');

module.exports = {
  builder: {},
  command: 'list',
  desc: 'List available mods',
  async handler() {
    for (const pkg of await list()) {
      console.log(pkg);
    }
  }
};


