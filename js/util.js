import fs from 'node:fs/promises';

export const readJSON = async file => {
	try {
		const data = await fs.readFile(file, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error(error);
	}
};

export const writeJSON = async (file, data, replacer = null, space = 2) => {
	try {
		const json = JSON.stringify(data, replacer, space);
		await fs.writeFile(file, json);
	} catch (error) {
		console.error(error);
	}
};

const arraytoCSV = (array, delim = '\t') => {
	if (array.length === 0) {
		throw new Error('Array is empty. Cannot write CSV file.');
	}

	const keysSet = new Set(array.flatMap(o => Object.keys(o)));
	const header = [...keysSet].join(delim);

	const rows = [];

	for (const object of array) {
		const row = [];
		for (const key of keysSet) {
			const value = object[key];

			if (typeof value === 'string' && value.includes(delim)) {
				row.push(`"${value}"`);
				continue;
			}

			row.push(value);
		}

		rows.push(row.join(delim));
	}

	const csv = [header, ...rows].join('\n');
	return csv;
};

export const writeCSV = async (file, array, delim) => {
	try {
		const csv = arraytoCSV(array, delim);
		await fs.writeFile(file, csv);
	} catch (error) {
		console.error(error);
	}
};

export const writeJSONandTSV = async (file, data) => Promise.all([
	await writeJSON(file, data, null, 2),
	await writeCSV(file.replace(/json$/, 'tsv'), data, '\t'),
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
