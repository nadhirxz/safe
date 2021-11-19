const fs = require('fs');
const path = require('path');
const { homedir, EOL } = require('os');
const { hash, decrypt, encrypt } = require('./encryption');

const configFile = path.join(homedir(), 'vault-config');

const exists = fs.existsSync(configFile) && fs.statSync(configFile).size != 0;

if (!exists) {
	const prompt = require('prompt-sync')();
	const password = prompt('Enter a master password: ', { echo: '*' });
	const data = hash(password) + EOL;
	fs.writeFileSync(configFile, data);
}

const config = fs.readFileSync(configFile, 'utf-8');
let [master, customVaultFile] = config.split(EOL);
let masterHash = hash(master, 'sha512', hash(master, 'md5'));
let [iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
let customVault = decrypt(customVaultFile, key, iv);

const vaultFilePath = customVault || path.join(homedir(), 'vault');
const vaultFile = path.join(vaultFilePath, fs.existsSync(vaultFilePath) && fs.lstatSync(vaultFilePath).isDirectory() ? 'vault' : '');

async function load() {
	if (!exists) fs.unlinkSync(vaultFile);
	if (!fs.existsSync(vaultFile)) fs.writeFileSync(vaultFile, '');

	let data = {};
	try {
		data = JSON.parse(decrypt(fs.readFileSync(vaultFile, 'utf-8'), key, iv)) || {};
	} catch {
		//
	}
	return data;
}

function save(data, path = vaultFile) {
	fs.writeFileSync(path, encrypt(JSON.stringify(data), key, iv));
}

async function saveData(path, afterLoad) {
	return load().then(data => {
		afterLoad && afterLoad();
		save(data, path);
	});
}

function saveConfig({ masterPassword = master, path = vaultFilePath }) {
	fs.writeFileSync(configFile, masterPassword + EOL + encrypt(path, key, iv));
}

function changePath(newPath) {
	newPath = path.join(newPath, fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory() ? 'vault' : '');
	const log = () => console.log(`new vault path: ${newPath}`);

	if (newPath.toLowerCase() != vaultFile.toLowerCase()) {
		saveConfig({ path: newPath });
		return saveData(newPath).then(() => {
			fs.unlinkSync(vaultFile);
			log();
		});
	}
	log();
}

function changePassword(password) {
	saveData(vaultFile, () => {
		master = hash(password);
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
		saveConfig({});
	});
}

function clearVault() {
	fs.unlinkSync(vaultFile);
}

function checkFile(filename) {
	const valid = fs.existsSync(filename) && fs.lstatSync(filename).isFile();
	return { valid, file: valid ? fs.readFileSync(filename) : null };
}

function exportFile(filename, buffer) {
	fs.writeFileSync(filename, buffer);
	console.log('entry exported to', filename);
}

module.exports = { load, save, changePath, changePassword, clearVault, checkFile, exportFile, vaultFile, exists, master };
