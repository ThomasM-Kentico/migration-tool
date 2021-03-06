/* eslint-disable no-console */
'use-strict';

const request = require('../general/request'),
	response = require('../general/response'),
	Promise = require('bluebird'),
	requestPromise = require('request-promise');

// Makes the whole import process happen
function importData (req, res, data) {
	let addOptions = [],
		upsertOptions = [],
		variant,
		elem,
		lang,
		importedItems = [];

	// Iterate content items in import data
	for (var i = 0; i < data.items.length; i++) {
		// Fill the array with request options that add a new content item
		addOptions.push(request.getAddOptions(req, data.items[i].item));
	}
	
	// Iterate serially add request options
	Promise.mapSeries(addOptions, (options, index) => {
		// Import a new content item in a Kentico Cloud project
		return requestPromise(options).then((items) => {
			response.sendLog(req, 'Content item "' + items.name + '"...');
			response.sendLog(req, '» Base data imported.');
			
			upsertOptions = [];

			// Store identifiers of the new content item
			importedItems.push({
				id: items.id,
				codename: items.codename
			});
	
			// Iterate content variants in the content item
			for (var j = 0; j < data.items[index].variants.length; j++) {
				variant = data.items[index].variants[j];
				elem = { elements: variant.elements };
				lang = variant.language.codename;
				// Fill the array with request options that add a new language variants for the content item 
				upsertOptions.push(request.getUpsertOptions(req, elem, items.id, lang));
			}

			// Iterate serially language request options
			return Promise.mapSeries(upsertOptions, (options) => {
				// Import a new language variant in the content item
				return requestPromise(options)
					.catch((error) => {
						throw error;
					});			
			})
				.then(() => {
					response.sendLog(req, '» Language variants imported.');
				})
				.catch((error) => {
					throw error;
				});
		})
		.catch((error) => {
			throw error;
		});
	})
		.then(() => {
			console.log('Import successful.');
			// In case of a successful import response with identifiers of imported content items
			response.send(res, 200, importedItems); 
		})
		.catch((error) => { 
			response.sendLog(req, 'Import failed. Deleting already imported items...');
			var deleteOptions = [];

			// In case of unsuccessful import delete already imported content items

			// Iterate already imported items
			for (var i = 0; i < importedItems.length; i++) {
				// Fill the array with request options that delete content items
				deleteOptions.push(request.getDeleteOptions(req, importedItems[i].id));
			}
		
			// Iterate delete request options, 2 requests in parallel
			return Promise.map(deleteOptions, (options) => {
				// Delete a content item from a Kentico Cloud project
				return requestPromise(options)
					.catch((error) => {
						throw error;
					});
			}, {concurrency: 2})
				.then(() => {
					response.sendLog(req, 'Successfully deleted.');
					response.send(res, error.statusCode, error.error.message, error.error.validation_errors); 
				});
		});
}

module.exports = {
	importData
};