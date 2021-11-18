#!/usr/bin/env node
const { program, Argument, Option } = require('commander');
const os = require('os');
const path = require('path');
const { hash } = require('./utils/encryption');
const { load, save, changePath } = require('./utils/files');
const prompt = require('prompt-sync')();

load().then(({ config, data, exists }) => {
	const [master, key] = config.split(os.EOL);
	const configChoices = ['path'];

	program
		.version('1.0.0')
		.description('Simple cli tool to save your secret stuff')
		.addArgument(new Argument('<action>', 'action you want to perform').choices(['add', 'remove', 'view', 'config']))
		.argument('<name>', 'entry name')
		.argument('[config]', 'config arguments')
		.addOption(new Option('-t, --type <type>').choices(['text', 'account']).default('text'))
		.action((action, name, config) => {
			if (action == 'add' && data.hasOwnProperty(name)) return console.log('This entry already exists');
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
			case 'add':
				if (type == 'account') {
					const username = prompt('Enter a username/email: ');
					const password = prompt('Enter a password: ', { echo: '*' });
					data[name] = { username, password };
				} else {
					const text = prompt('Enter your text: ');
					data[name] = text;
				}
				save(data);
				break;

			case 'remove':
				break;

			case 'view':
				if (data[name] == undefined) return console.log("This entry doesn't exist");
				if (typeof data[name] == 'object') {
					console.log('User:', data[name].username);
					console.log('Password:', data[name].password);
				} else {
					console.log(data[name]);
				}
				break;

			case 'config':
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
				}
				break;
		}
	}

	function runAction(action, name, exists, config) {
		let password = '';
		if (exists) password = prompt('Enter your master password: ', { echo: '*' });

		if (!exists || hash(password) == master) {
			run(action, name, program.opts().type, config);
		} else {
			console.log('Wrong password');
			runAction(action, name, exists);
		}
	}
});
