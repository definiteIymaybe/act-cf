import process from "node:process";
import {
	readJSON,
	removeSameKeyValues,
	flattenObject,
	pipe,
	writeJSONandTSV,
} from "./js/util.js";

const ignoreKeys = ["plan.id", "plan.name", "development_mode"];

const keepKeys = [];

export function processJSON(input) {
	return pipe(
		array => array.map(o => flattenObject(o)),
		array => removeSameKeyValues(array, keepKeys, ignoreKeys),
	)(input);
}

export const main = async file => {
	file ||= process.argv[2];

	const array = await readJSON(file);

	const outputJSON = processJSON(array);
	const outputFile = file.replace("raw/", "");

	await writeJSONandTSV(outputFile, outputJSON);
};

await main();
