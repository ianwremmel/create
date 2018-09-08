'use strict';

const {template} = require('../lib/templating');
const {exists} = require('../lib/file');

exports.builder = function builder(yargs) {
  return yargs
    .demand('template')
    .positional('template', {
      description:
        'Name of the template to apply. Template extension should be omitted',
      type: 'string'
    })
    .options({
      force: {
        alias: 'f',
        default: false,
        description: 'Overwrite an existing template',
        type: 'boolean'
      }
    });
};

exports.command = 'template [template]';

exports.desc = 'Apply a single template in the current directory';

exports.handler = async function handler(argv) {
  const {force, template: tpl} = argv;

  if ((await exists(tpl)) && !force) {
    throw new Error(
      'Template result file already exists. Please specify --force to overwrite'
    );
  }

  await template(tpl, argv);
};
