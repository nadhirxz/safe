const fs = require('fs');
const path = require('path');
const { homedir, EOL } = require('os');
const { hash, random, decrypt, encrypt } = require('./encryption');

const configFile = path.join(homedir(), 'vault-config');

const exists = fs.existsSync(configFile) && fs.statSync(configFile).size != 0;

if (!exists) {
	const prompt = require('prompt-sync')();
	const password = prompt('Enter a master password: ', { echo: '*' });
	const data = hash(password) + EOL + random(8) + ':' + random(16);
	fs.writeFileSync(configFile, data);
}

const config = fs.readFileSync(configFile, 'utf-8');
const [master, enc, customVaultFile] = config.split(EOL);
const [iv, key] = enc.split(':');
const customVault = decrypt(customVaultFile, key, iv);

const vaultFilePath = customVault || path.join(homedir(), 'vault');
const vaultFile = path.join(vaultFilePath, fs.existsSync(vaultFilePath) && fs.lstatSync(vaultFilePath).isDirectory() ? 'vault' : '');

if (!fs.existsSync(vaultFile)) fs.writeFileSync(vaultFile, '');

async function load() {
	let data = {};
	try {
		data = JSON.parse(decrypt(fs.readFileSync(vaultFile, 'utf-8'), key, iv)) || {};
	} catch {
		//
	}
	return { config, data, exists };
}

function save(data, path = vaultFile) {
	fs.writeFileSync(path, encrypt(JSON.stringify(data), key, iv));
}

function changePath(newPath) {
	newPath = path.join(newPath, fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory() ? 'vault' : '');
	const log = () => console.log(`Vault is now located at ${newPath}`);

	if (newPath.toLowerCase() != vaultFile.toLowerCase()) {
		fs.writeFileSync(configFile, master + EOL + enc + EOL + encrypt(newPath, key, iv));
		return load()
			.then(({ data }) => save(data, newPath))
			.then(() => {
				fs.unlinkSync(vaultFile);
				log();
			});
	}
	log();
}

module.exports = { load, save, changePath };
