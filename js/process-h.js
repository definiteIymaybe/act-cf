
import {join} from 'node:path';
import {arrayToCSV, flattenObject, readJSON, writeJSON, writeFile, bytesToSize} from './util.js';

const mergeServerLabels = server => {
	if (server?.labels && Object.keys(server.labels).length > 0) {
		const hasNoValues = Object.values(server.labels).every(value => !value);
		if (hasNoValues) {
			server.labels = Object.keys(server.labels).join(', ');
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

const convertBytesToSize = (keys, object) => {
	for (const key of keys) {
		if (object[key]) {
			object[key] = bytesToSize(object[key]);
		}
	}

	return object;
};

const processServerItem = o => {
	delete o.datacenter.server_types;
	let server = mergeServerLabels(o);
	server = processServerPrices(o);
	const trafficKeys = ['outgoing_traffic', 'ingoing_traffic', 'included_traffic'];
	server.server_type = convertBytesToSize(trafficKeys, server.server_type);
	server = convertBytesToSize(trafficKeys, server);
	return server;
};

const processJSON = json => json?.servers?.map(server => processServerItem(server));

const main = async () => {
	const file = './data/raw/servers.json';
	const outputDir = './data/processed';
	const filename = 'servers';

	const inputJSON = await readJSON(file);
	const processedJSON = processJSON(inputJSON);
	const flatJSON = processedJSON.map(server => flattenObject(server));
	const tsv = arrayToCSV(flatJSON, '\t');

	await Promise.all([
		writeJSON(join(outputDir, `${filename}.json`), processedJSON, null, 2),
		writeJSON(join(outputDir, `${filename}.flat.json`), flatJSON, null, 2),
		writeFile(join(outputDir, `${filename}.tsv`), tsv),
	]);
};

await main();
