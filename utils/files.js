const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { hash, decrypt, encrypt } = require('./encryption');
const prompt = require('prompt-sync')({ sigint: true });

const configFile = path.join(homedir(), 'safe-config');
const defaultSafe = path.join(homedir(), 'safe');

const exists = fs.existsSync(configFile) && fs.statSync(configFile).size != 0;

let master, config, masterHash, iv, key;

if (!exists) {
	master = hash(prompt('enter a master password: ', { echo: '*' }));
	masterHash = hash(master, 'sha512', hash(master, 'md5'));
	[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
	config = { file: 'safe-config' };

	fs.writeFileSync(configFile, encrypt(JSON.stringify(config), key, iv));
}

async function load(reset = false) {
	if (reset || (exists && !master)) {
		master = hash(prompt('password: ', { echo: '*' }));
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
		config = JSON.parse(decrypt(fs.readFileSync(configFile, 'utf-8'), key, iv)) || {};
	}

	if (!(config && typeof config == 'object' && config.file == 'safe-config')) {
		console.log('wrong password');
		return load(true);
	}

	const safeFilePath = getSafePath();
	const safeFile = path.join(safeFilePath, fs.existsSync(safeFilePath) && fs.lstatSync(safeFilePath).isDirectory() ? 'safe' : '');

	if (!fs.existsSync(safeFile)) fs.writeFileSync(safeFile, '');

	return JSON.parse(decrypt(fs.readFileSync(safeFile, 'utf-8'), key, iv)) || {};
}

function save(data, path = getSafePath()) {
	fs.writeFileSync(path, encrypt(JSON.stringify(data), key, iv));
}

async function saveData(path, afterLoad) {
	return load().then(data => {
		afterLoad && afterLoad();
		save(data, path);
	});
}

function saveConfig(path = getSafePath()) {
	fs.writeFileSync(configFile, encrypt(JSON.stringify({ file: 'safe-config', path }), key, iv));
}

function changePath(newPath) {
	newPath = path.join(newPath, fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory() ? 'safe' : '');

	if (newPath.toLowerCase() != getSafePath().toLowerCase()) {
		saveConfig(newPath);
		saveData(newPath).then(() => {
			fs.unlinkSync(getSafePath());
			console.log(`new safe path: ${newPath}`);
		});
		return;
	}
	console.log(`safe path is already ${newPath}`);
}

function changePassword(password) {
	saveData(getSafePath(), () => {
		master = hash(password);
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
		saveConfig();
	});
}

function clearSafe() {
	fs.unlinkSync(getSafePath());
}

function checkFile(filename) {
	const valid = fs.existsSync(filename) && fs.lstatSync(filename).isFile();
	return { valid, file: valid ? fs.readFileSync(filename) : null };
}

function exportFile(filename, buffer) {
	fs.writeFileSync(filename, buffer);
	console.log('entry exported to', filename);
}

function getSafePath() {
	return config.path || defaultSafe;
}

module.exports = { load, save, changePath, changePassword, clearSafe, checkFile, exportFile, getSafePath };
