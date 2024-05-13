import { readJSON, writeJSON } from "./util.js";

const removeDynamicProperties = data => {
	const filterEntries = o => Object.entries(o).filter(([k]) => k.includes("ff"));
	const fromEntries = entries => Object.fromEntries(entries);
	const filterObject = o => fromEntries(filterEntries(o));

	return data.servers.map(o => filterObject(o));
};

const main = async () => {
	const file = "data/processed/servers.json";
	const data = await readJSON(file);
	const stableData = removeDynamicProperties(data);
	await writeJSON(file, stableData, null, 2);
};

await main();
