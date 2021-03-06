#!/usr/bin/env node
const { program, Argument, Option } = require('commander');
const os = require('os');
const path = require('path');
const { load, save, changePath, changePassword, clearSafe, checkFile, exportFile, getFullSafePath, getSafePath, absolutePathTest, validPathTest } = require('./utils/files');
const prompt = require('prompt-sync')({ sigint: true });
const chalk = require('chalk');

const actionChoices = ['add', 'remove', 'view', 'config', 'list', 'path', 'clear'];
const configChoices = ['path', 'password'];
const yesno = ['y', 'yes', 'no', 'n'];
const yes = ['y', 'yes'];

program
	.version('1.0.0')
	.description('Simple cli tool to save your secret stuff')
	.addArgument(new Argument('<action>', 'action you want to perform').choices(actionChoices))
	.argument('[name]', 'entry name')
	.argument('[config]', 'config arguments')
	.addOption(new Option('-t, --type <type>').choices(['text', 'account']).default('text'))
	.option('-f, --file <filename>', 'used with add to insert a file')
	.option('-o, --output <filename>', 'output entry instead of console log')
	.option('-s, --safe <filename>', 'safe path')
	.option('--no-color', 'no color')
	.action((action, name, config) => {
		if (action == 'config' && !configChoices.includes(name))
			return console.log(
				`invalid config option (choices: ${configChoices
					.map(e => `"${e}"`)
					.join(', ')
					.trim()})`
			);
		run(action, name, config);
	})
	.parse();

function run(action, name, config, type = program.opts().type) {
	const safePath = program.opts().safe;
	load({ safePath }).then(data => {
		switch (action) {
			case 'add': {
				const file = program.opts().file;
				if (!name) return console.log("argument 'name' is required");
				if (data.hasOwnProperty(name)) return console.log(chalk.yellowBright('entry already exists'));
				if (file) {
					const check = checkFile(file);
					if (!check.valid) return console.log(chalk.yellowBright(`${chalk.underline(file)} doesn't exist`));
					data[name] = { filename: file, buffer: check.file };
				} else if (type == 'account') {
					const username = prompt(chalk.bold('username/email: '));
					const password = prompt(chalk.bold('password: '), { echo: '*' });
					data[name] = { username, password };
				} else {
					const text = prompt(chalk.bold('your text: '));
					data[name] = text;
				}
				save(data, safePath);
				console.log(chalk.bold.green('entry added successfully'));
				break;
			}

			case 'remove': {
				if (!name) return console.log("argument 'name' is required");
				if (data[name] == undefined) return console.log("entry doesn't exist");
				let confirm = '';
				while (!yesno.includes(confirm.toLowerCase())) {
					confirm = prompt(chalk.bold.red(`are you sure you want to remove "${name}" ? (Y/N): `));
				}
				if (yes.includes(confirm.toLowerCase())) {
					delete data[name];
					save(data, safePath);
					console.log(chalk.bold.green('entry removed successfully'));
				}
				break;
			}

			case 'view': {
				if (!name) return console.log("argument 'name' is required");
				if (data[name] == undefined) return console.log("entry doesn't exist");

				const output = program.opts().output;

				if (typeof data[name] == 'object') {
					if (data[name].filename != undefined) {
						const buffer = Buffer.from(data[name].buffer.data);

						if (output) return exportFile(output, buffer);

						if (require('utf-8-validate')(buffer)) return console.log(buffer.toString());

						let confirm = '';
						while (!yesno.includes(confirm.toLowerCase())) {
							confirm = prompt('this entry is a file. would you like to export it ? (Y/N): ');
						}

						if (yes.includes(confirm.toLowerCase())) {
							exportFile(data[name].filename, buffer);
						}
					} else {
						const out = `${chalk.bold('username/email:')} ${data[name].username}
						${chalk.bold('password:')} ${data[name].password}`;

						if (output) return exportFile(output, Buffer.from(out, 'utf-8'));
						console.log(out);
					}
				} else {
					if (output) return exportFile(output, Buffer.from(data[name], 'utf-8'));
					console.log(data[name]);
				}
				break;
			}

			case 'config': {
				if (!name) return console.log("argument 'name' is required");
				switch (name) {
					case 'path':
						let providedPath = config;
						if (!providedPath) return console.log(chalk.yellowBright('please provide a path'));
						const absolute = absolutePathTest.test(providedPath);
						if (!absolute) {
							const validPath = validPathTest.test(providedPath);
							if (!validPath) return console.log(chalk.yellowBright('invalid path'));
							providedPath = path.join(process.cwd(), providedPath);
						}
						changePath(providedPath);
						break;
					case 'password':
						changePassword(prompt(chalk.bold('new password: ')), safePath);
						console.log(chalk.bold.green('password changed'));
						break;
				}
				break;
			}

			case 'list': {
				const keys = Object.keys(data);
				if (keys.length) return console.log(['entry list: ', ...keys.map(e => ` - ${e}`)].join(os.EOL));
				console.log(chalk.bold('safe is empty'));
				break;
			}

			case 'path': {
				console.log('current path:', chalk.underline(getFullSafePath(getSafePath(safePath))));
				break;
			}

			case 'clear': {
				let confirm = '';
				while (!yesno.includes(confirm.toLowerCase())) {
					confirm = prompt(chalk.bold.red(`are you sure you want to clear the safe ? (Y/N): `));
				}
				if (yes.includes(confirm.toLowerCase())) {
					clearSafe(safePath);
					console.log(chalk.bold.green('safe cleared successfully'));
				}
				break;
			}
		}
	});
}
