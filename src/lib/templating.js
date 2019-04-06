const path = require('path');

const _ = require('lodash');
const {copyFile, readFile, writeFile} = require('mz/fs');
const mkdirp = require('mkdirp');
const {debug, format: f} = require('@ianwremmel/debug');
const d = debug(__filename);

/**
 * Write handlebars templates into current dir.
 * @param {string} filename - template filename
 * @param {Object} context - argv
 */
exports.template = async function template(filename, context = {}) {
  d(f`Templating ${filename} into project`);

  let tpl;
  try {
    d(f`Checking for ${filename} with ejs extension`);
    tpl = await readFile(
      path.resolve(__dirname, '..', '..', 'templates', `${filename}.ejs`),
      'utf8'
    );
    d(f`Found ${filename} with ejs extension`);
  } catch (err) {
    d(f`Checking for ${filename} without ejs extension`);
    tpl = await readFile(
      path.resolve(__dirname, '..', '..', 'templates', filename),
      'utf8'
    );
    d(f`Found for ${filename} with ejs extension`);
  }
  const out = _.template(tpl)(context);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  d(f`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  d('Done');

  d(f`Writing template to ${dest}`);
  await writeFile(dest, out);
  d('Done');
};

/**
 * Copy a file to the project directory
 * @param {string} filename - local file
 */
exports.copy = async function copy(filename) {
  d(f`Copying ${filename} into project`);

  const src = path.resolve(__dirname, '..', '..', 'templates', filename);
  const dest = path.resolve(process.cwd(), filename);
  const dir = path.dirname(dest);

  d(f`Ensuring directory ${dir}`);
  mkdirp.sync(dir);
  d('Done');

  d(f`Copying ${src} to ${dest}`);
  // @ts-ignore - typescript is picking up the wrong variant
  await copyFile(src, dest);
  d('Done');
};
