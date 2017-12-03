'use strict';

const path = require('path');

const chalk = require('chalk');
const debug = require('debug');
const invariant = require('invariant');
const supportsColor = require('supports-color');

const pkg = require('../../package');

module.exports = d;
exports.f = f;

/**
 * Wrapper around debug to ensure consistency across the project
 * @example
 * const {d, f} = require('./debug')(__filename)
 * d('a plain string');
 * d(f`a string with ${1} variable`);
 * @param {string} filename
 * @returns {Function}
 */
function d(filename) {
  invariant(filename, '$filename is required');
  invariant(typeof filename === 'string', '$filename must be a string');

  const rootPath = path.resolve(__filename, '..', '..');

  const projectPath = filename.replace(rootPath, '');

  const name = pkg.name
    .split('/')
    .pop();

  const prefix = `${name}${projectPath
    .replace(/^cjs/, '')
    .replace(/^es/, '')
    .replace(/^src/, '')
    .replace(/\//g, ':')
    .replace(/.js$/, '')}`;

  return {
    d: debug(prefix),
    f
  };
}

/**
 * Formatter for template strings.
 * @param {Array<string>} tpl
 * @param {Array<mixed>} params
 * @returns {string}
 */
function f(tpl, ...params) {

  let res = '';
  for (let i = 0; i < tpl.length; i++) {
    res += tpl[i];
    // If we've reached that last position, don't print params[i] (params will
    // always have one less entry than tpl)
    if (params.length !== i) {
      res += v(params[i]);
    }
  }
  return res;
}

exports.f = f;

/**
   * Colorizes variables for template string
   * @param {mixed} value
   * @returns {string}
   */
function v(value) {
  if (!supportsColor.stdout) {
    return `"${value}"`;
  }

  switch (typeof value) {
    case 'boolean':
      return value ? chalk.green(value) : chalk.red(value);
    case 'number':
      return chalk.yellow(value);
    case 'string':
      if (value.includes('/')) {
        return chalk.green(value);
      }
      return chalk.blue(value);
    default:
      return chalk.grey(value);
  }
}
