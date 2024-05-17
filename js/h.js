#!/usr/bin/env node

import { join } from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import {
	arrayToCSV,
	bytesToSize,
	filterKeys,
	flattenObject,
	mapObject,
	numberIfNumeric,
	writeJSON,
} from "./util.js";

const processPrices = ({
	server_type: { prices },
	datacenter: {
		location: { name },
	},
}) => {
	let currentLocationPrice = null;
	let isBestPrice = true;

	for (const price of prices) {
		if (price.location === name) {
			currentLocationPrice = price;
		}

		if (
			currentLocationPrice
			&& Number.parseFloat(price.price_monthly.gross)
				< Number.parseFloat(currentLocationPrice.price_monthly.gross)
		) {
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

const get = (url, token, options) => {
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
	return fetch(url, { headers, ...options });
};

const getVariables = (prefix = "HP") => {
	const result = [];

	let i = 0;

	while (true) {
		let token;
		let projectId;
		let projectName;

		try {
			const key = `${prefix}${i}`;
			token = `${process.env[key]}`;
			projectId = `${process.env[`${key}ID`]}`;
			projectName = `${process.env[`${key}NAME`]}`;
		} catch {}

		if (!token || !projectId || !projectName) {
			return result;
		}

		result.push({ token, projectId, projectName });
		i++;
	}
};

const getData = async ({ token, projectId, projectName, items = "servers" }) => {
	const url = `${process.env.HAPI}/${items}`;
	const response = await get(url, token);

	if (!response.ok) {
		console.error("Failed to fetch data");
		return;
	}

	const json = await response.json();

	const flattened = json[items].map(item => {
		const o = transformObject(item);
		return { ...o, project_id: projectId, project_name: projectName };
	});

	const dir = join("data", `${projectId}`, `${projectName}`);

	await fs.mkdir(dir, { recursive: true });

	const tsv = arrayToCSV(flattened, "\t");
	const flatJsonPath = join(dir, `${items}.flat.json`);
	const tsvPath = join(dir, `${items}.tsv`);

	return Promise.all([
		writeJSON(flatJsonPath, items, { spaces: "\t" }),
		fs.writeFile(tsvPath, tsv),
	]);
};

const main = async () => {
	const variables = getVariables();
	const promises = variables.map((...vars) => getData(...vars));
	await Promise.all(promises);
};

await main();
