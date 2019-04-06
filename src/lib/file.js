import * as path from 'path';

import {access, constants, readFile} from 'mz/fs';

/**
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
export async function exists(filename) {
  const fullPath = path.resolve(process.cwd(), filename);
  try {
    await access(fullPath, constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * @param {string} filename
 * @returns {Promise<string>}
 */
export async function readFileOrEmpty(filename) {
  try {
    return await readFile(filename, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}
