'use strict';

const path = require('path');

const debug = require('debug')('proj:lib:templating');
const handlebars = require('handlebars');
const {
  copyFile, readFile, writeFile
} = require('mz/fs');
const mkdirp = require('mkdirp');

/**
 * Write handlebars templates into current dir.
 *
 * @param {string} filename - template filename
 * @param {object} context - argv
 * @returns {Promise} -
 */
exports.template = async function template(filename, context) {
  debug(`Templating ${filename} into project`);

  let tpl;
  try {
    debug(`Checking for ${filename} with hbs extension`);
    tpl = await readFile(path.resolve(__dirname, '..', 'templates', `${filename}.hbs`), 'utf8');
    debug(`Found ${filename} with hbs extension`);
  }
  catch (err) {
    debug(`Checking for ${filename} without hbs extension`);
    tpl = await readFile(path.resolve(__dirname, '..', 'templates', filename), 'utf8');
    debug(`Found for ${filename} with hbs extension`);
  }
  const out = handlebars.compile(tpl)(context);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  debug(`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  debug('Done');

  debug(`Writing template to ${dest}`);
  await writeFile(dest, out);
  debug('Done');
};

/**
 * Copy a file to the project directory
 *
 * @param {string} filename - local file
 * @param {object} context - argv
 * @returns {Promise} -
 */
exports.copy = async function copy(filename) {
  debug(`Copying ${filename} into project`);

  const src = path.resolve(__dirname, '..', 'templates', filename);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  debug(`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  debug('Done');

  debug(`Copying ${src} to ${dest}`);
  await copyFile(src, dest);
  debug('Done');
};

