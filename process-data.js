import process from 'node:process';
import {
	flattenJSON,
	readJSON,
	compose,
	removeCommonKeys,
	writeJSONandTSV,
} from './js/util.js';

/** Constants for keys that need specific treatments */
const IGNORED_KEYS = ['plan.id', 'plan.name', 'development_mode'];
const DATE_KEYS = ['created_on', 'updated_on', 'activated_on', 'modified_on'];
const DATE_FORMAT_PROPS = ['da', {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}];

/**
 * Excludes given keys from an object.
 * @param {Array} keysToExclude - Keys to exclude from the object.
 * @return {Function} Function that excludes keys from an object.
 */
const excludeKeysFromObject = keysToExclude => object => {
	for (const key of keysToExclude) {
		delete object[key];
	}

	return object;
};

/**
 * Formats date strings in an object.
 * @param {Array} keys - Keys to search and format.
 * @param {Function} formatFn - Function that formats the date.
 * @return {Function} Function that formats date strings in an object.
 */
const formatDates = (keys, formatFn) => object => {
	for (const key of keys) {
		if (Object.hasOwn(object, key)) {
			object[key] = formatFn(object[key]);
		}
	}

	return object;
};

/**
 * Processes input data with several operations.
 * @param {Array} data - Input data.
 * @return {Array} Processed data.
 */
const processData = data => {
	const operations = compose(
		flattenJSON,
		formatDates(DATE_KEYS, date => new Date(date).toLocaleDateString(...DATE_FORMAT_PROPS)),
		excludeKeysFromObject(IGNORED_KEYS),
	);

	return removeCommonKeys(data.map(item => operations(item)));
};

/**
 * Main execution function.
 */
const main = async () => {
	const inputFile = process.argv[2];
	const rawData = await readJSON(inputFile);
	await writeJSONandTSV(inputFile, rawData);

	const processedData = processData(rawData);
	const outputFile = inputFile.replace('raw/', '');
	await writeJSONandTSV(outputFile, processedData);
};

main();
