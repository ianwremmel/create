'use strict';

const path = require('path');

const {readdir} = require('mz/fs');

exports.list = async function list() {
  const files = await readdir(path.resolve(__dirname, '../mods'));
  return files.map((f) => path.basename(f, '.js'));
};

exports.apply = async function apply(modName, cwd) {
  const startDir = process.cwd();
  try {
    process.chdir(cwd);
    const mod = require(path.resolve(__dirname, '../mods', modName));
    await mod();
  }
  finally {
    process.chdir(startDir);
  }
};
