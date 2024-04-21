#! /usr/bin/env node
import fs from 'node:fs/promises';

export const {writeFile} = fs;

const isArrayOfStings = array => array.every(item => typeof item === 'string');

export function flattenObject(o) {
	const result = {};

	for (const i in o) {
		if (!Object.hasOwn(o, i)) {
			continue;
		}

		if (Array.isArray(o[i])) {
			result[i] = isArrayOfStings(o[i]) ? o[i].join(', ') : o[i];
		}

		if ((typeof o[i]) === 'object' && o[i] !== null) {
			const flatObject = flattenObject(o[i]);
			for (const x in flatObject) {
				if (!Object.hasOwn(flatObject, x)) {
					continue;
				}

				result[i + '.' + x] = flatObject[x];
			}
		} else {
			result[i] = o[i];
		}
	}

	return result;
}

export const readJSON = async file => {
	try {
		const data = await fs.readFile(file, 'utf8');

		return JSON.parse(data);
	} catch {
		console.error('error');
	}
};

export const writeJSON = async (file, data, replacer = null, space = '\t') => {
	try {
		const json = JSON.stringify(data, replacer, space);
		await fs.writeFile(file, json);
	} catch {
		console.error('error');
	}
};

export const arrayToCSV = (array, delim = '\t') => {
	if (array.length === 0) {
		throw new Error('Array is empty. Cannot write CSV file.');
	}

	const keysSet = new Set(array.flatMap(o => Object.keys(o)));
	const header = [...keysSet].join(delim);

	let csv = header + '\n';

	for (const object of array) {
		const row = [];

		for (const key of keysSet) {
			let value = object[key];

			if (value === null || value === undefined) {
				row.push('');
				continue;
			}

			if (typeof value === 'object') {
				value = Array.isArray(value) ? value.join(',') : JSON.stringify(value);
			}

			if (typeof value === 'string') {
				if (value.includes(delim)) {
					value = `"${value}"`;
				}

				// Escape quotes
				value = value.replace(/"/g, '""');
			}

			row.push(value);
		}

		csv += row.join(delim) + '\n';
	}

	return csv;
};

export const writeCSV = async (file, array, delim) => {
	try {
		const csv = arrayToCSV(array, delim);
		await fs.writeFile(file, csv);
	} catch {
		console.error('error');
	}
};

export const writeJSONandTSV = async (file, data) => Promise.all([
	writeJSON(file, data),
	writeCSV(file.replace(/json$/, 'tsv'), data, '\t'),
]);

export const flattenJSON = json => {
	const result = {};
	for (const [key, value] of Object.entries(json)) {
		if (value && !Array.isArray(value) && typeof value === 'object') {
			for (const [subKey, subValue] of Object.entries(value)) {
				result[`${key}.${subKey}`] = subValue;
			}
		} else {
			result[key] = value;
		}
	}

	return result;
};

export const removeSameKeyValues = (array, keep = []) => {
	const keysToCheck = Array.from(
		new Set(array.flatMap(object => Object.keys(object))),
	);

	const keysToRemove = keysToCheck.filter(key => {
		if (keep.includes(key)) {
			return false;
		}

		let result = true;

		if (typeof array[0][key] === 'object') {
			result = array.every(o =>
				JSON.stringify(o[key]) === JSON.stringify(array[0][key]),
			);
		} else {
			result = array.every(o => o[key] === array[0][key]);
		}

		return result;
	});

	for (const object of array) {
		for (const key of keysToRemove) {
			delete object[key];
		}
	}

	return array;
};

export const removeKeys = (o, keys) => {
	for (const key of keys) {
		delete o[key];
	}

	return o;
};
