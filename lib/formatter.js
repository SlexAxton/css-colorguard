'use strict';

var gray = require('colorette').gray;
var underline = require('colorette').underline;
var logSymbols = require('log-symbols');
var path = require('path');
var plur = require('plur');
var table = require('text-table');

function logFrom (fromValue) {
    if (!fromValue.indexOf('<')) {
        return fromValue;
    }
    return path.relative(process.cwd(), fromValue);
}

function collisions (messages) {
    var num = messages.length + plur(' collision', messages.length);
    return '\n\n  ' + logSymbols.error + '  ' + num + ' found.\n';
}

module.exports = function (input) {
  var messages = input.messages;
  var source = input.source;

  if (!messages.length) {
    return '  ' + logSymbols.success + '  No collisions found.';
  }

  var filename = underline(logFrom(source)) + '\n';

  return filename + table(messages.map(function (msg) {
    var last = msg.text.lastIndexOf('(');
    var warning = msg.text.slice(0, last).trim();
    var position = msg.text.slice(last, msg.text.length);
    return [
      '',
      gray('line ' + msg.node.source.start.line),
      gray('col ' + msg.node.source.start.column),
      warning,
      gray(position)
    ];
  })) + collisions(messages);
};
