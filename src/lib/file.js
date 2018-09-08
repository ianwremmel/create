'use strict';

const path = require('path');

const fs = require('mz/fs');

exports.exists = async function exists(filename) {
  const fullPath = path.resolve(process.cwd(), filename);
  try {
    await fs.access(fullPath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};
