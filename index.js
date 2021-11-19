#!/usr/bin/env node
const { program, Argument, Option } = require('commander');
const os = require('os');
const path = require('path');
const { hash } = require('./utils/encryption');
const { load, save, changePath, changePassword, vaultFile } = require('./utils/files');
const prompt = require('prompt-sync')({ sigint: true });

load().then(({ data, exists, master }) => {
	const actionChoices = ['add', 'remove', 'view', 'config', 'list', 'path'];
	const configChoices = ['path', 'password'];

	program
		.version('1.0.0')
		.description('Simple cli tool to save your secret stuff')
		.addArgument(new Argument('<action>', 'action you want to perform').choices(actionChoices))
		.argument('[name]', 'entry name')
		.argument('[config]', 'config arguments')
		.addOption(new Option('-t, --type <type>').choices(['text', 'account']).default('text'))
		.action((action, name, config) => {
			if (action == 'config' && !configChoices.includes(name))
				return console.log(
					`invalid config option (choices: ${configChoices
						.map(e => `"${e}"`)
						.join(', ')
						.trim()})`
				);
			runAction(action, name, exists, config);
		})
		.parse();

	function run(action, name, type = 'text', config) {
		switch (action) {
			case 'add': {
				if (!name) return console.log("argument 'name' is required");
				if (data.hasOwnProperty(name)) return console.log('entry already exists');
				if (type == 'account') {
					const username = prompt('username/email: ');
					const password = prompt('password: ', { echo: '*' });
					data[name] = { username, password };
				} else {
					const text = prompt('your text: ');
					data[name] = text;
				}
				save(data);
				console.log('entry added successfully');
				break;
			}

			case 'remove': {
				if (!name) return console.log("argument 'name' is required");
				if (data[name] == undefined) return console.log("entry doesn't exist");
				let confirm = '';
				while (!['y', 'n'].includes(confirm.toLowerCase())) {
					confirm = prompt(`are you sure you want to remove "${name}" ? (Y/N): `);
				}
				if (confirm.toLowerCase() == 'y') {
					delete data[name];
					save(data);
					console.log('entry removed successfully');
				}
				break;
			}

			case 'view': {
				if (!name) return console.log("argument 'name' is required");
				if (data[name] == undefined) return console.log("entry doesn't exist");
				if (typeof data[name] == 'object') {
					console.log('username/email:', data[name].username);
					console.log('password:', data[name].password);
				} else {
					console.log(data[name]);
				}
				break;
			}

			case 'config': {
				if (!name) return console.log("argument 'name' is required");
				switch (name) {
					case 'path':
						let providedPath = config;
						if (!providedPath) return console.log('please provide a path');
						const absolute = /[a-zA-Z]:\\(((?![<>:"/\\|?*]).)+((?<![ .])\\)?)*/.test(providedPath);
						if (!absolute) {
							const validPath = /^(?!.*[\\\/]\s+)(?!(?:.*\s|.*\.|\W+)$)(?:[a-zA-Z]:)?(?:(?:[^<>:"\|\?\*\n])+(?:\/\/|\/|\\\\|\\)?)+$/.test(providedPath);
							if (!validPath) return console.lod('invalid path');
							providedPath = path.join(process.cwd(), providedPath);
						}
						changePath(providedPath);
						break;
					case 'password':
						changePassword(prompt('new password: '));
						break;
				}
				break;
			}

			case 'list': {
				const keys = Object.keys(data);
				if (keys.length) return console.log(keys.map(e => ` - ${e}`).join(os.EOL));
				console.log('empty');
				break;
			}

			case 'path': {
				console.log('current path:', vaultFile);
				break;
			}
		}
	}

	function runAction(action, name, exists, config) {
		let password = '';
		if (exists) password = prompt('password: ', { echo: '*' });

		if (!exists || hash(password) == master) {
			run(action, name, program.opts().type, config);
		} else {
			console.log('wrong password');
			runAction(action, name, exists);
		}
	}
});
