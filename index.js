#!/usr/bin/env node
const { program, Argument, Option } = require('commander');
const os = require('os');
const { hash } = require('./utils/encryption');
const { load, save } = require('./utils/files');
const prompt = require('prompt-sync')();

load().then(({ config, data, exists }) => {
	const [master, key] = config.split(os.EOL);

	program
		.version('1.0.0')
		.description('Simple cli tool to save your secret stuff')
		.addArgument(new Argument('<action>', 'action you want to perform').choices(['add', 'remove', 'view']))
		.argument('<name>', 'entry name')
		.addOption(new Option('-t, --type <type>').choices(['text', 'account']).default('text'))
		.action((action, name) => {
			if (action == 'add' && data.hasOwnProperty(name)) return console.log('This entry already exists');
			runAction(action, name, exists);
		})
		.parse();

	function run(action, name, type = 'text') {
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
		}
	}

	function runAction(action, name, exists) {
		let password = '';
		if (exists) password = prompt('Enter your master password: ', { echo: '*' });

		if (!exists || hash(password) == master) {
			run(action, name, program.opts().type);
		} else {
			console.log('Wrong password');
			runAction(action, name, exists);
		}
	}
});
