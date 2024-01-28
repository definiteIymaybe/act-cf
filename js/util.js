import fs from 'node:fs/promises';

/**
 * Composes multiple functions into one.
 * @param {...Function} fns - Functions to compose.
 * @return {Function} Composed function.
 */
export const compose = (...fns) => x => fns.reduce((v, f) => f(v), x);

/**
 * Reads a JSON file and returns its content.
 * @param {string} file - Path to the file.
 * @return {Object} Parsed JSON content.
 * @throws Will throw an error if reading or parsing fails.
 */
export const readJSON = async file => {
	try {
		const data = await fs.readFile(file, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error(error);
	}
};

export const writeJSON = async (file, data, replacer = null, spaces = '\t') => {
	try {
		await fs.writeFile(file, JSON.stringify(data, replacer, spaces));
	} catch (error) {
		console.error(error);
	}
};

const arrayToCSV = (array, delimiter = '\t') => {
	if (array.length === 0) {
		throw new Error('Array is empty. Cannot write CSV file.');
	}

	const keysSet = new Set(array.flatMap(o => Object.keys(o)));
	const header = [...keysSet].join(delimiter);

	const rows = array.map(object => [...keysSet].map(key => {
		let value = object[key];
		if (typeof value === 'string') {
			value = value.trim();

			if (value.includes(delimiter)) {
				return `"${value}"`;
			}
		}

		return value;
	}).join(delimiter));

	return [header, ...rows].join('\n');
};

export const writeCSV = async (file, array, delimiter) => {
	try {
		const csv = arrayToCSV(array, delimiter);
		await fs.writeFile(file, csv);
	} catch (error) {
		console.error(error);
	}
};

export const writeData = (file, data, delimiter = '\t') => {
	const fileType = delimiter === '\t' ? 'tsv' : 'csv';
	const newFile = file.replace(/json$/, fileType);
	return Promise.all([
		writeJSON(file, data, null, 2),
		writeCSV(newFile, data, delimiter),
	]);
};

export const flattenObject = (json, prefix = '', delimiter = '.') => {
	const result = {};

	for (const [key, value] of Object.entries(json)) {
		const newKey = prefix ? `${prefix}${delimiter}${key}` : key;

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(result, flattenObject(value, newKey, delimiter));
		} else {
			result[newKey] = value;
		}
	}

	return result;
};

function isEqual(a, b) {
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return a === b;
	}

	const [aKeys, bKeys] = [a, b].map(o => Object.keys(o));

	if (aKeys.length !== bKeys.length) {
		return false;
	}

	for (const key of aKeys) {
		if (!isEqual(a[key], b[key])) {
			return false;
		}
	}

	return true;
}

export const removeSameKeyValues = (array, keep = [], remove = []) => {
	if (array.length === 0) {
		return array;
	}

	const keysToRemove = new Set([...(array), ...remove]);

	console.log({keysToRemove});

	for (const keptKey of keep) {
		console.log({keptKey});

		keysToRemove.delete(keptKey);
	}

	const result = array.map(o => removeKeys(o, keysToRemove));
	return result;
};

export function removeKeys(object, keys) {
	for (const key of keys) {
		delete object[key];
	}

	return object;
}

function getKeysWithIdenticalValues(array) {
	const allKeysInObjects = new Set(array.flatMap(o => Object.keys(o)));
	const keysWithIdenticalValues = new Set();

	for (const key of allKeysInObjects) {
		const firstObjectKeyValue = array[0][key];

		const areAllObjectKeyValuesEqual = array.slice(1).every(item => isEqual(item[key], firstObjectKeyValue));
		if (areAllObjectKeyValuesEqual) {
			console.log({key, firstObjectKeyValue});
		}

		if (areAllObjectKeyValuesEqual) {
			keysWithIdenticalValues.add(key);
		}
	}

	return keysWithIdenticalValues;
}

export const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)));
