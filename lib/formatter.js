import chalk      from 'chalk';
import logSymbols from 'log-symbols';
import path       from 'path';
import plur       from 'plur';
import table      from 'text-table';

function logFrom (fromValue) {
    if (!fromValue.indexOf('<')) {
        return fromValue;
    }
    return path.relative(process.cwd(), fromValue);
}

function collisions (messages) {
    const num = messages.length + plur(' collision', messages.length);
    return '\n\n  ' + logSymbols.error + '  ' + num + ' found.\n';
}

export default function (input) {
  const messages = input.messages;
  const source = input.source;

  if (!messages.length) {
    return '  ' + logSymbols.success + '  No collisions found.';
  }

  const filename = chalk.underline(logFrom(source)) + '\n';

  return filename + table(messages.map((msg) => {
    const last = msg.text.lastIndexOf('(');
    const warning = msg.text.slice(0, last).trim();
    const position = msg.text.slice(last, msg.text.length);
    return [
      '',
      chalk.gray('line ' + msg.node.source.start.line),
      chalk.gray('col ' + msg.node.source.start.column),
      warning,
      chalk.gray(position)
    ];
  })) + collisions(messages);
};
