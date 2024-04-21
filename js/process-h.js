
import {join} from 'node:path';
import {arrayToCSV, flattenObject, readJSON, writeJSON, writeFile} from './util.js';

const processJSON = json => {
	const priceTypes = ['hourly', 'monthly'];
	const costTypes = ['net', 'gross'];
	const result = json?.servers?.map(server => {
		if (Array.isArray(server?.server_type?.prices)) {
			server.server_type.prices = server.server_type.prices.map(datacenter => {
				for (const priceType of priceTypes) {
					const key = `price_${priceType}`;

					for (const costType of costTypes) {
						const costKey = `${costType}`;

						try {
							if (datacenter[key] && datacenter[key][costKey]) {
								const number_ = Number.parseFloat(datacenter[key][costKey]);
								datacenter[key][costKey] = number_.toFixed(10).replace(/\.?0+$/, '');
								datacenter[key][costKey] = Number.parseFloat(datacenter[key][costKey]);
							}
						} catch {
							console.error('error');
						}
					}
				}

				return datacenter;
			});
		}

		delete server.datacenter.server_types;
		return server;
	});

	return result;
};

const convertLabelsToArray = json => {
	const result = json?.servers?.map(server => {
		if (Array.isArray(server?.labels)) {
			server.labels = server.labels.map(label => label.key);
		}

		return server;
	});

	return result;
};

const main = async () => {
	const file = './data/raw/servers.json';
	const outputDir = './data/processed';
	const filename = 'servers';

	const inputJSON = await readJSON(file);
	const processedJSON = processJSON(inputJSON);

	const flatJSON = inputJSON.servers.map(server => {
		delete server.server_type.prices;

		if (server?.labels && Object.keys(server.labels).length > 0) {
			const hasNoValues = Object.values(server.labels).every(value => !value);
			if (hasNoValues) {
				server.labels = Object.keys(server.labels).join(', ');
			}
		}

		if (server.server_type.prices) {
			server.server_type.prices.map(datacenter => {
				const {
					location,
					price_monthly,
					price_hourly,
					...rest
				} = datacenter;

				return {
					location,
					price_monthly_gross: price_monthly.gross,
					...rest,
				};
			});
		}

		return flattenObject(server);
	});
	const tsv = arrayToCSV(flatJSON, '\t');

	await Promise.all([
		writeJSON(join(outputDir, `${filename}.json`), processedJSON, null, 2),
		writeJSON(join(outputDir, `${filename}.flat.json`), flatJSON, null, 2),
		writeFile(join(outputDir, `${filename}.tsv`), tsv),
	]);
};

await main();
