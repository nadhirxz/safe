const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { hash, decrypt, encrypt } = require('./encryption');
const prompt = require('prompt-sync')({ sigint: true });

const configFile = path.join(homedir(), 'vault-config');
const defaultVault = path.join(homedir(), 'vault');

const exists = fs.existsSync(configFile) && fs.statSync(configFile).size != 0;

let master, config, masterHash, iv, key;

if (!exists) {
	master = hash(prompt('enter a master password: ', { echo: '*' }));
	masterHash = hash(master, 'sha512', hash(master, 'md5'));
	[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
	config = { file: 'vault-config' };

	fs.writeFileSync(configFile, encrypt(JSON.stringify(config), key, iv));
}

async function load(reset = false) {
	if (reset || (exists && !master)) {
		master = hash(prompt('password: ', { echo: '*' }));
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
		config = JSON.parse(decrypt(fs.readFileSync(configFile, 'utf-8'), key, iv)) || {};
	}

	if (!(config && typeof config == 'object' && config.file == 'vault-config')) {
		console.log('wrong password');
		return load(true);
	}

	const vaultFilePath = getVaultPath();
	const vaultFile = path.join(vaultFilePath, fs.existsSync(vaultFilePath) && fs.lstatSync(vaultFilePath).isDirectory() ? 'vault' : '');

	if (!fs.existsSync(vaultFile)) fs.writeFileSync(vaultFile, '');

	return JSON.parse(decrypt(fs.readFileSync(vaultFile, 'utf-8'), key, iv)) || {};
}

function save(data, path = getVaultPath()) {
	fs.writeFileSync(path, encrypt(JSON.stringify(data), key, iv));
}

async function saveData(path, afterLoad) {
	return load().then(data => {
		afterLoad && afterLoad();
		save(data, path);
	});
}

function saveConfig(path = getVaultPath()) {
	fs.writeFileSync(configFile, encrypt(JSON.stringify({ file: 'vault-config', path }), key, iv));
}

function changePath(newPath) {
	newPath = path.join(newPath, fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory() ? 'vault' : '');

	if (newPath.toLowerCase() != getVaultPath().toLowerCase()) {
		saveConfig(newPath);
		saveData(newPath).then(() => {
			fs.unlinkSync(getVaultPath());
			console.log(`new vault path: ${newPath}`);
		});
		return;
	}
	console.log(`vault path is already ${newPath}`);
}

function changePassword(password) {
	saveData(getVaultPath(), () => {
		master = hash(password);
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
		saveConfig();
	});
}

function clearVault() {
	fs.unlinkSync(getVaultPath());
}

function checkFile(filename) {
	const valid = fs.existsSync(filename) && fs.lstatSync(filename).isFile();
	return { valid, file: valid ? fs.readFileSync(filename) : null };
}

function exportFile(filename, buffer) {
	fs.writeFileSync(filename, buffer);
	console.log('entry exported to', filename);
}

function getVaultPath() {
	return config.path || defaultVault;
}

module.exports = { load, save, changePath, changePassword, clearVault, checkFile, exportFile, getVaultPath };
