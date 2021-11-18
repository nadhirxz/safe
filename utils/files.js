const fs = require('fs');
const path = require('path');
const os = require('os');
const { hash, random, decrypt, encrypt } = require('./encryption');

const configFile = path.join(os.homedir(), 'vault-config');
const vaultFile = path.join(os.homedir(), 'vault');

const exists = fs.existsSync(configFile) && fs.statSync(configFile).size != 0;

if (!exists) {
	const prompt = require('prompt-sync')();
	const password = prompt('Enter a master password: ', { echo: '*' });
	const data = hash(password) + os.EOL + random(8) + ':' + random(16);
	fs.writeFileSync(configFile, data);
}

if (!fs.existsSync(vaultFile)) fs.writeFileSync(vaultFile, '');

const config = fs.readFileSync(configFile, 'utf-8');
const [_, enc] = config.split(os.EOL);
const [iv, key] = enc.split(':');

async function load() {
	let data = {};
	try {
		data = JSON.parse(decrypt(fs.readFileSync(vaultFile, 'utf-8'), key, iv)) || {};
	} catch {
		//
	}
	return { config, data, exists };
}

function save(data) {
	fs.writeFileSync(vaultFile, encrypt(JSON.stringify(data), key, iv));
}

module.exports = { load, save };
