#! /usr/bin/env node

import fs from "node:fs/promises";

export const readJSON = async file => {
	try {
		const data = await fs.readFile(file, "utf8");
		return JSON.parse(data);
	} catch {
		console.error("error");
	}
};

export const { writeFile } = fs;

export const writeJSON = async (file, data) => {
	try {
		await fs.writeFile(file, JSON.stringify(data, null, "\t"));
	} catch {
		console.error("error");
	}
};

export const isArrayOfStringifiable = array => array.every(item => typeof item !== "object" || item === null);

export const filterKeys = (object, patterns, recursive = false) => Object.fromEntries(
	Object.entries(object)
		.filter(([key]) => !patterns.some(pattern => pattern.test(key)))
		.map(([key, value]) => [
			key,
			recursive && typeof value === "object" && value !== null
				? filterKeys(value, patterns, true)
				: value,
		]),
);

export const numberIfNumeric = value => {
	if (value === null || value === "") {
		return value;
	}

	if (typeof value === "string" && !Number.isNaN(Number(value))) {
		return Number(value);
	}

	return value;
};

export function flattenObject(object) {
	const result = {};

	const flatten = (object_, prefix = "") => {
		for (const [key, value] of Object.entries(object_)) {
			const newKey = prefix ? `${prefix}.${key}` : key;

			if (Array.isArray(value)) {
				if (value.length === 0) {
					result[newKey] = "";
					continue;
				}

				result[newKey] = isArrayOfStringifiable(value) ? value.join(",") : flatten(value, prefix);
			} else if (typeof value === "object" && value !== null) {
				flatten(value, newKey);
			} else {
				result[newKey] = value;
			}
		}
	};

	flatten(object);
	return result;
}

export const mapObject = (object, fn, recursive = true) => Object.fromEntries(
	Object.entries(object).map(([key, value]) => [
		key,
		recursive && typeof value === "object" && value !== null
			? mapObject(value, fn, true)
			: fn(value),
	]),
);

const round = (value, decimals) => Number(new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value));

export const bytesToSize = bytes => {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

	const decimals = {
		Bytes: 0,
		KB: 0,
		MB: 0,
		GB: 1,
		TB: 2,
	};

	if (bytes === 0) {
		return "0";
	}

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = bytes / (1024 ** i);
	const unit = sizes[i];
	const decimal = decimals[unit];

	let value = `${round(size, decimal)}`;

	if (value.includes(".")) {
		value = value.replace(/\.?0+$/, "");
	}

	return `${value} ${unit}`;
};

export const arrayToCSV = (array, delim = "\t") => {
	if (array.length === 0) {
		throw new Error("Array is empty. Cannot write CSV file.");
	}

	const keysSet = new Set(array.flatMap(object => Object.keys(object)));
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
