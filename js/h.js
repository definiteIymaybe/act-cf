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

const get = async (url, token, options) => {
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};

	try {
		const response = await fetch(url, { headers, ...options });

		if (!response.ok) {
			console.error("Failed to fetch data");
			return null;
		}

		return response;
	} catch {
		return null;
	}
};

const getVariables = (prefix = "HP") => {
	const result = [];
	const incorrectValues = new Set(["undefined", "null", ""]);

	let i = 0;

	while (i < 10) {
		let token;
		let projectId;
		let projectName;

		try {
			const key = `${prefix}${i}`;
			token = process.env[key];
			projectId = process.env[`${key}ID`];
			projectName = process.env[`${key}NAME`];

			if (!token || !projectId || !projectName
                || incorrectValues.has(token.toLowerCase())
                || incorrectValues.has(projectId.toLowerCase())
                || incorrectValues.has(projectName.toLowerCase())) {
				break;
			}

			result.push({ token, projectId, projectName });
		} catch {
			break;
		}

		i += 1;
	}

	return result;
};

const getData = async ({ token, projectId, projectName, items = "servers" }) => {
	const url = `${process.env.HAPI}/${items}`;

	const response = await get(url, token);

	if (!response) {
		console.error("Failed to fetch data");
		return;
	}

	try {
		const json = await response.json();

		const flattened = json[items].map(item => {
			const o = transformObject(item);
			return { ...o, project_id: projectId, project_name: projectName };
		});

		const folder = join("data", "processed", "h", `${projectId}`, `${projectName}`);
		await fs.mkdir(folder, { recursive: true });

		const tsv = arrayToCSV(flattened, "\t");
		const flatJsonPath = join(folder, `${items}.flat.json`);
		const tsvPath = join(folder, `${items}.tsv`);

		await Promise.all([
			writeJSON(flatJsonPath, flattened, { spaces: "\t" }),
			fs.writeFile(tsvPath, tsv),
		]);
	} catch {
		console.error("Error processing response");
	}
};

const main = async () => {
	const variables = getVariables();

	const promises = variables.map((...variables_) => getData(...variables_));
	await Promise.all(promises);
};

await main();
