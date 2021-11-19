const crypto = require('crypto');

function hash(text, algorithm = 'sha256', salt = '') {
	return salt ? crypto.pbkdf2Sync(text, salt, 200, 24, algorithm).toString('hex') : crypto.createHash(algorithm).update(text).digest('hex');
}

function random(bytes) {
	return crypto.randomBytes(bytes).toString('hex');
}

function encrypt(val, key, iv) {
	try {
		let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
		let encrypted = cipher.update(val, 'utf8', 'base64');
		encrypted += cipher.final('base64');
		return encrypted;
	} catch {
		return false;
	}
}

function decrypt(val, key, iv) {
	try {
		let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
		let decrypted = decipher.update(val, 'base64', 'utf8');
		return decrypted + decipher.final('utf8');
	} catch {
		return false;
	}
}

module.exports = { hash, random, encrypt, decrypt };
