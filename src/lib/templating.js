'use strict';

const path = require('path');

const _ = require('lodash');
const {copyFile, readFile, writeFile} = require('mz/fs');
const mkdirp = require('mkdirp');

const {d: debug, f} = require('./debug')(__filename);

/**
 * Write handlebars templates into current dir.
 * @param {string} filename - template filename
 * @param {Object} context - argv
 */
exports.template = async function template(filename, context) {
  debug(f`Templating ${filename} into project`);

  let tpl;
  try {
    debug(f`Checking for ${filename} with ejs extension`);
    tpl = await readFile(
      path.resolve(__dirname, '..', 'templates', `${filename}.ejs`),
      'utf8'
    );
    debug(f`Found ${filename} with ejs extension`);
  } catch (err) {
    debug(f`Checking for ${filename} without ejs extension`);
    tpl = await readFile(
      path.resolve(__dirname, '..', 'templates', filename),
      'utf8'
    );
    debug(f`Found for ${filename} with ejs extension`);
  }
  const out = _.template(tpl)(context);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  debug(f`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  debug('Done');

  debug(f`Writing template to ${dest}`);
  await writeFile(dest, out);
  debug('Done');
};

/**
 * Copy a file to the project directory
 * @param {string} filename - local file
 */
exports.copy = async function copy(filename) {
  debug(f`Copying ${filename} into project`);

  const src = path.resolve(__dirname, '..', 'templates', filename);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  debug(f`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  debug('Done');

  debug(f`Copying ${src} to ${dest}`);
  await copyFile(src, dest);
  debug('Done');
};
