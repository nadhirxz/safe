const fs = require('fs');
const path = require('path');
const { homedir } = require('os');
const { hash, decrypt, encrypt } = require('./encryption');
const prompt = require('prompt-sync')({ sigint: true });

const configFile = path.join(homedir(), 'safe-config');
const defaultSafe = path.join(homedir(), 'safe');

const exists = fileHasData(configFile);

let master, config, masterHash, iv, key;

if (!exists) {
	master = hash(prompt('enter a master password: ', { echo: '*' }));
	masterHash = hash(master, 'sha512', hash(master, 'md5'));
	[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
	config = {};

	fs.writeFileSync(configFile, encrypt(JSON.stringify(config), key, iv));
}

async function load({ reset = false, safePath = null, forSave = false }) {
	if (!forSave) {
		if (safePath == null ? reset || (exists && fileHasData(getSafePath()) && !master) : fileHasData(getFullSafePath(safePath))) master = hash(prompt('password: ', { echo: '*' }));
		else master = hash(prompt('enter a master password: ', { echo: '*' }));
	}

	masterHash = hash(master, 'sha512', hash(master, 'md5'));
	[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
	safePath == null ? (config = JSON.parse(decrypt(fs.readFileSync(configFile, 'utf-8'), key, iv)) || {}) : null;

	const safeFile = getFullSafePath(getSafePath(safePath));

	if (!fileHasData(safeFile)) save({}, safeFile);

	const safe = JSON.parse(decrypt(fs.readFileSync(safeFile, 'utf-8'), key, iv)) || {};

	if (!forSave && !(safe && safe.key == master)) {
		console.log('wrong password');
		return load({ reset: true, safePath });
	}

	return safe.data;
}

function save(data, path = getSafePath()) {
	console.log(data);
	console.log(JSON.stringify({ key: master, data: data || {} }));
	fs.writeFileSync(path, encrypt(JSON.stringify({ key: master, data: data || {} }), key, iv));
}

async function saveData(path, afterLoad) {
	return load({ forSave: true }).then(data => {
		afterLoad && afterLoad();
		save(data, path);
	});
}

function saveConfig(path = getSafePath()) {
	fs.writeFileSync(configFile, encrypt(JSON.stringify({ path }), key, iv));
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

function changePassword(password, safePath) {
	saveData(getSafePath(safePath), () => {
		master = hash(password);
		masterHash = hash(master, 'sha512', hash(master, 'md5'));
		[iv, key] = [masterHash.slice(0, 16), masterHash.slice(16, 48)];
	});
}

function clearSafe(safePath) {
	fs.unlinkSync(getSafePath(safePath));
}

function checkFile(filename) {
	const valid = fs.existsSync(filename) && fs.lstatSync(filename).isFile();
	return { valid, file: valid ? fs.readFileSync(filename) : null };
}

function exportFile(filename, buffer) {
	fs.writeFileSync(filename, buffer);
	console.log('entry exported to', filename);
}

function getSafePath(safePath) {
	return safePath || (config ? config.path : null) || defaultSafe;
}

function getFullSafePath(safeFilePath = getSafePath()) {
	return path.join(safeFilePath, fs.existsSync(safeFilePath) && fs.lstatSync(safeFilePath).isDirectory() ? 'safe' : '');
}

function fileHasData(filename) {
	return fs.existsSync(filename) && fs.statSync(filename).size != 0;
}

module.exports = { load, save, changePath, changePassword, clearSafe, checkFile, exportFile, getSafePath };
