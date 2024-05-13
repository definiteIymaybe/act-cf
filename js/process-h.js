import { join } from "node:path";
import fs from "node:fs/promises";
import {
	arrayToCSV,
	bytesToSize,
	flattenObject,
	readJSON,
	writeFile,
	writeJSON,
} from "./util.js";

const mergeServerLabels = server => {
	if (server?.labels && Object.keys(server.labels).length > 0) {
		const hasNoValues = Object.values(server.labels).every(value => !value);
		if (hasNoValues) {
			server.labels = Object.keys(server.labels).join(", ");
		}
	}

	return server;
};

const processServerPrices = server => {
	if (!Array.isArray(server?.server_type?.prices)) {
		return server;
	}

	const prices = {};

	for (const datacenter of server.server_type.prices) {
		if (datacenter.price_monthly && datacenter.price_monthly.gross) {
			const key = datacenter.location;
			prices[key] = Number.parseFloat(datacenter.price_monthly.gross);
		}
	}

	server.server_type.prices = prices;

	return server;
};

const convertBytesToSize = object => {
	for (const key in object) {
		if (key.includes("ff") && object[key]) {
			object[key] = bytesToSize(object[key]);
		}
	}

	return object;
};

const processItem = o => {
	delete o.datacenter.server_types;
	let server = mergeServerLabels(o);
	server = processServerPrices(o);
	server.server_type = convertBytesToSize(server.server_type);
	server = convertBytesToSize(server);
	return server;
};

const processJSON = json => json?.servers?.map(server => processItem(server));

const removeDynamicProperties = data => {
	const filterEntries = o => Object.entries(o).filter(([k]) => !k.includes("ff"));
	const fromEntries = entries => Object.fromEntries(entries);
	const filterObject = o => fromEntries(filterEntries(o));

	return filterObject(data);
};

const processAndWriteData = async (folder, filename, data, isStatic = false) => {
	const processedData = isStatic ? data.map(item => removeDynamicProperties(item)) : data;
	const flatData = processedData.map(item => flattenObject(item));
	const tsvData = arrayToCSV(flatData, "\t");

	await Promise.all([
		writeJSON(join(folder, `${filename}.json`), processedData, null, 2),
		writeJSON(join(folder, `${filename}.flat.json`), flatData, null, 2),
		writeFile(join(folder, `${filename}.tsv`), tsvData),
	]);
};

const main = async () => {
	const file = "./data/raw/servers.json";
	const folderProcessed = "./data/processed";
	const folderProcessedStatic = "./data/processed-static";
	const filename = "servers";

	await fs.mkdir(folderProcessedStatic, { recursive: true });

	const inputJSON = await readJSON(file);
	const processedJSON = processJSON(inputJSON);

	await processAndWriteData(folderProcessed, filename, processedJSON);
	await processAndWriteData(folderProcessedStatic, filename, processedJSON, true);
};

await main();
