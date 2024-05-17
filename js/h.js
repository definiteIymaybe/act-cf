#!/usr/bin/env node

import { basename, join, parse } from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import { arrayToCSV, bytesToSize, readJSON, filterKeys, flattenObject, mapObject, numberIfNumeric, writeJSON } from "./util.js";

const processPrices = ({ server_type: { prices }, datacenter: { location: { name } } }) => {
	let currentLocationPrice = null;
	let isBestPrice = true;

	for (const price of prices) {
		if (price.location === name) {
			currentLocationPrice = price;
		}

		if (currentLocationPrice && Number.parseFloat(price.price_monthly.gross) < Number.parseFloat(currentLocationPrice.price_monthly.gross)) {
			isBestPrice = false;
		}
	}

	return { currentLocationPrice, isBestPrice };
};

const transformObject = o => {
	const { currentLocationPrice, isBestPrice } = processPrices(o);

	o.server_type.included_traffic = bytesToSize(o.server_type.included_traffic);
	o.price = Number.parseFloat(currentLocationPrice.price_monthly.gross);
	o.best_price = isBestPrice;

	delete o.datacenter.server_types;
	delete o.server_type.prices;
	delete o.public_net.ipv4.id;

	o = filterKeys(o, [/ff/], false);
	o = flattenObject(o);
	o = mapObject(o, numberIfNumeric, true);

	return o;
};

const main = async () => {
	const file = process.argv[2];
	const projectId = process.env.PROJECT_ID;
	const projectName = process.env.PROJECT_NAME;

	if (!file || !projectId || !projectName) {
		console.error("Missing required arguments: file, projectId, projectName");
		return;
	}

	const { name, dir } = parse(file);
	const projectDir = dir.replace("raw", "processed");

	await fs.mkdir(projectDir, { recursive: true });

	const json = await readJSON(file);

	const o = json.servers
		.map(item => {
			const o = transformObject(item);
			return { ...o, project_id: projectId, project_name: projectName };
		});

	const tsv = arrayToCSV(o, "\t");
	const flatJsonPath = join(projectDir, `${name}.flat.json`);
	const tsvPath = join(projectDir, `${name}.tsv`);

	await writeJSON(flatJsonPath, o, { spaces: "\t" });

	console.log("saved flat json", flatJsonPath);

	await fs.writeFile(tsvPath, tsv);

	console.log("saved tsv", tsvPath);

	// await Promise.all([
	// ]);
};

await main();
