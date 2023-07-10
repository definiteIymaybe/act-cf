import process from 'node:process';
import {
	flattenJSON,
	readJSON,
	removeKeys,
	removeSameKeyValues,
	writeJSONandTSV,
} from './js/util.js';

const excludedKeys = [
	'plan.id',
	'plan.name',
	'development_mode',
];

const keptKeys = [];

const processJSON = inputJSON => {
	const processItem = o => {
		const flat = flattenJSON(o);
		const result = removeKeys(flat, excludedKeys);
		return result;
	};

	const processArray = (array = []) => {
		let result = array.map(o => processItem(o));
		result = removeSameKeyValues(result, keptKeys);
		return result;
	};

	const result = processArray(inputJSON);
	return result;
};

const main = async () => {
	const file = process.argv[2];

	const json = await readJSON(file);
	await writeJSONandTSV(file, json);

	const outputJSON = processJSON(json);
	const outputFile = file.replace('raw/', '');

	console.log({outputFile});

	await writeJSONandTSV(outputFile, outputJSON);
};

await main();
