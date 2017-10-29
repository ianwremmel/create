'use strict';

const handlebars = require(`handlebars`);
const {readFile, writeFile} = require(`mz/fs`);
const mkdirp = require(`mkdirp`);
const path = require(`path`);

/**
 * Write handlebars templates into current dir.
 *
 * @param {string} filename - template filename
 * @param {object} context - argv
 * @returns {Promise} -
 */
exports.template = async function template(filename, context) {
  let tpl;
  try {
    tpl = await readFile(path.resolve(__dirname, `..`, `templates`, `${filename}.hbs`), `utf8`);
  }
  catch (err) {
    tpl = await readFile(path.resolve(__dirname, `..`, `templates`, filename), `utf8`);
  }
  const out = handlebars.compile(tpl)(context);
  const outPath = path.resolve(process.cwd(), filename);
  mkdirp.sync(path.dirname(outPath));
  await writeFile(outPath, out);
};
