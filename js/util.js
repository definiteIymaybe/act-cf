#! /usr/bin/env node
import fs from "node:fs/promises";

export const { writeFile } = fs;

const isArrayOfStings = array => array.every(item => typeof item === "string");

export function flattenObject(o) {
	const result = {};

	for (const i in o) {
		if (!Object.hasOwn(o, i)) {
			continue;
		}

		if (Array.isArray(o[i])) {
			result[i] = isArrayOfStings(o[i]) ? o[i].join(", ") : o[i];
		}

		if ((typeof o[i]) === "object" && o[i] !== null) {
			const flatObject = flattenObject(o[i]);
			for (const x in flatObject) {
				if (!Object.hasOwn(flatObject, x)) {
					continue;
				}

				result[i + "." + x] = flatObject[x];
			}
		} else {
			result[i] = o[i];
		}
	}

	return result;
}

export const readJSON = async file => {
	try {
		const data = await fs.readFile(file, "utf8");
		return JSON.parse(data);
	} catch {
		console.error("error");
	}
};

export const writeJSON = async (file, data, replacer = null, space = "\t") => {
	try {
		const json = JSON.stringify(data, replacer, space);
		await fs.writeFile(file, json);
	} catch {
		console.error("error");
	}
};

export const arrayToCSV = (array, delim = "\t") => {
	if (array.length === 0) {
		throw new Error("Array is empty. Cannot write CSV file.");
	}

	const keysSet = new Set(array.flatMap(o => Object.keys(o)));
	const header = [...keysSet].join(delim);

	let csv = header + "\n";

	for (const object of array) {
		const row = [];

		for (const key of keysSet) {
			let value = object[key];

			if (value === null || value === undefined) {
				row.push("");
				continue;
			}

			if (typeof value === "object") {
				value = Array.isArray(value) ? value.join(",") : JSON.stringify(value);
			}

			if (typeof value === "string") {
				if (value.includes(delim)) {
					value = `"${value}"`;
				}

				value = value.replaceAll("\"", "\"\"");
			}

			row.push(value);
		}

		csv += row.join(delim) + "\n";
	}

	return csv;
};

export const writeCSV = async (file, array, delim) => {
	try {
		const csv = arrayToCSV(array, delim);
		await fs.writeFile(file, csv);
	} catch {
		console.error("error");
	}
};

export const writeJSONandTSV = async (file, data) => Promise.all([
	writeJSON(file, data),
	writeCSV(file.replace(/json$/, "tsv"), data, "\t"),
]);

export const removeSameKeyValues = (array, keep = [], remove = []) => {
	if (array.length === 0) {
		return array;
	}

	const keysToRemove = new Set([...(array), ...remove]);

	for (const keptKey of keep) {
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

// eslint-disable-next-line unicorn/no-array-reduce
export const pipe = (...fns) => fns.reduce((f, g) => (...arguments_) => g(f(...arguments_)));

const round = (value, decimals) => Number(new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value));

export function bytesToSize(bytes, decimals = 2, unit) {
	if (bytes === 0) {
		return "0";
	}

	const k = 1024;
	let dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

	const i = unit ? sizes.indexOf(unit) : Math.floor(Math.log(bytes) / Math.log(k));

	if (sizes[i] === "MB") {
		dm = 0;
	}

	return `${round(bytes / (k ** i), dm)} ${sizes[i]}`;
}
