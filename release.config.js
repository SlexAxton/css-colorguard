const { readFile } = require('fs');
const { join } = require('path');
const { promisify } = require('util');
const { gitmojis } = require('gitmojis');

const readFileAsync = promisify(readFile);

const template = readFileAsync(join(__dirname, 'default-template.hbs'));
const commitTemplate = readFileAsync(join(__dirname, 'commit-template.hbs'));

module.exports = {
  branches: ['master'],
  plugins: [
    [
      'semantic-release-gitmoji',
      {
        releaseRules: {
          major: gitmojis.filter(({ semver }) => semver === 'major').map(({ code }) => code),
          minor: gitmojis.filter(({ semver }) => semver === 'minor').map(({ code }) => code),
          patch: gitmojis.filter(({ semver }) => semver === 'patch').map(({ code }) => code),
        },
        releaseNotes: {
          template,
          partials: { commitTemplate },
          helpers: {
            groupCommits(commits, options) {
              const allCommits = Object.values(commits).flat();
              let groupedCommits = {};

              allCommits
                .filter((commit) => commit !== undefined)
                .forEach((commit) => {
                  const gitmoji = gitmojis.find(
                    ({ emoji }) => emoji.localeCompare(commit.gitmoji) === 0
                  );

                  if (gitmoji === undefined) {
                    return;
                  }

                  groupedCommits = {
                    ...groupedCommits,
                    [gitmoji.semver]: [...(groupedCommits[gitmoji.semver] || []), commit],
                  };
                });

              return options.fn(groupedCommits);
            },
          },
        },
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          "yarn version ${nextRelease.version} && echo '::set-output name=version::${nextRelease.version}'",
        publishCmd: 'yarn npm publish --access public',
      },
    ],
    [
      '@semantic-release/git',
      {
        message:
          '🚀 RELEASE: chore(release) - ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    ["@semantic-release/github", {
      "assets": [
        {"path": "packages/**/dist/**", "label": "JS distribution"},
      ]
    }],
  ],
};

