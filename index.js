import process from 'node:process';
import {
	readJSON,
	writeData,
	removeSameKeyValues,
	flattenObject,
	pipe,
} from './js/util.js';

const ignoreKeys = [
	'plan.id',
	'plan.name',
	'development_mode',
];

const keepKeys = [];

export function processJSON(input) {
	return pipe(
		array => array.map(object => flattenObject(object)),
		array => removeSameKeyValues(array, keepKeys, ignoreKeys),
	)(input);
}

export const main = async file => {
	file ||= process.argv[2];

	const array = await readJSON(file);
	await writeData(file, array);

	const outputJSON = processJSON(array);
	const outputFile = file.replace('raw/', '');

	await writeData(outputFile, outputJSON);
};

await main();
