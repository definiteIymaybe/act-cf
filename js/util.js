import fs from 'node:fs/promises';

/**
 * Composes multiple functions into one.
 * @param {...Function} fns - Functions to compose.
 * @return {Function} Composed function.
 */
export const compose = (...fns) => x => fns.reduce((v, f) => f(v), x);

/**
 * Reads a JSON file and returns its content.
 * @param {string} file - Path to the file.
 * @return {Object} Parsed JSON content.
 * @throws Will throw an error if reading or parsing fails.
 */
export const readJSON = async file => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON from ${file}:`, error);
    throw error;
  }
};

/**
 * Writes data to a JSON file.
 * @param {string} file - Path to the file.
 * @param {Object} data - Data to write.
 * @param {Function} replacer - Replacer function.
 * @param {number} space - Number of spaces to indent.
 * @throws Will throw an error if writing fails.
 */
export const writeJSON = async (file, data, replacer = null, space = 2) => {
  try {
    const json = JSON.stringify(data, replacer, space);
    await fs.writeFile(file, json);
  } catch (error) {
    console.error(error);
  }
};

/**
 * Escapes a value for CSV.
 * @param {string} value - Value to escape.
 * @return {string} Escaped value.
 */
export const escapeCSV = value => {
  if (typeof value !== 'string') {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
};

/**
 * Converts an array of objects to a CSV string.
 * @param {Array} array - Array of objects.
 * @param {string} delim - Delimiter to use.
 * @return {string} CSV string.
 * @throws Will throw an error if the array is empty.
 */

export const arraytoCSV = (array, delim = '\t') => {
  if (array.length === 0) {
    throw new Error('Array is empty. Cannot write CSV file.');
  }

  const keys = [...new Set(array.flatMap(o => Object.keys(o)))];

  const header = keys.map(k => escapeCSV(k)).join(delim);
  const rows = array.map(o => keys.map(key => escapeCSV(o[key])).join(delim),
  );

  return [header, ...rows].join('\n');
};

/**
 * Writes data to a CSV file.
 * @param {string} file - Path to the file.
 * @param {Array} array - Array of objects to write.
 * @param {string} delim - Delimiter to use.
 * @throws Will throw an error if writing fails.
 */

export const writeCSV = async (file, array, delim) => {
  try {
    const csv = arraytoCSV(array, delim);
    await fs.writeFile(file, csv);
  } catch (error) {
    console.error(error);
  }
};

/**
 * Writes data to a JSON and a TSV file.
 * @param {string} file - Path to the file.
 * @param {Object} data - Data to write.
 * @throws Will throw an error if writing fails.
 */

export const writeJSONandTSV = async (file, data) => Promise.all([
  await writeJSON(file, data, null, 2),
  await writeCSV(file.replace(/json$/, 'tsv'), data, '\t'),
]);

/**
 * Flattens a JSON object.
 * @param {Object} json - JSON object to flatten.
 * @return {Object} Flattened JSON object.
 *
 * Example:
 *
 * Input:   { a: { b: { c: 1 } } }
 * Output:  { a.b.c: 1 }
 */

export const flattenJSON = json => {
  const result = {};
  for (const [key, value] of Object.entries(json)) {
    if (value && !Array.isArray(value) && typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        result[`${key}.${subKey}`] = subValue;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Removes common keys from an array of objects.
 * @param {Array} items - Array of objects.
 * @return {Array} Array of objects without common keys.
 *
 * Example:
 *
 * Input:    [{ a: 1, b: 2 },{ a: 1, c: 3 }]
 * Output:   [{ b: 2 },{ c: 3 }]
 */

export const removeCommonKeys = items => {
  if (items.length === 0) {
    return [];
  }

  const firstObject = items[0];

  const keysToRemove = new Set(Object.keys(firstObject).filter(key =>
    items.every(o => o[key] === firstObject[key]),
  ));

  return items.map(o => {
    const newObject = {};
    for (const key of Object.keys(o)) {
      if (keysToRemove.has(key)) {
        continue;
      } else {
        newObject[key] = o[key];
      }
    }
    return newObject;
  });
};
