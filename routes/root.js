/* eslint-disable no-console */
'use strict';

const express = require('express'),
	router = express.Router(),
	requestPromise = require('request-promise'),
	request = require('../import/request'),
	response = require('../import/response'),
	validation = require('../import/validation'),
	importData = require('../import/import'),
	blueprint = require('../blueprint/blueprint');

// Tool UI
router.get('/', (req, res) => {
	res.render('app');
});

// Import endpoint
router.post('/:projectId', (req, res) => {
	
	// If no body sent
	if (Object.keys(req.body).length === 0 && req.body.constructor === Object) {
		response.send(res, 400, 'The request must contain import data in the JSON format sent as the request body.');
		return;
	}

	// Check the top-level property in the request body
	if (!req.body.hasOwnProperty('items') || (req.body.hasOwnProperty('items') && !(req.body.items instanceof Array))) {
		response.send(res, 400, 'The request body must have the top-level property "items" of type array.');
		return;
	}

	// First level - Validate Project ID and API key in the authorization header
	requestPromise(request.getAPIKeyProjectIDOptions(req))
		.then(() => {		

			// Second level - Validate content models
			requestPromise(request.getContentModelsOptions(req))
				.then((contentModels) => {
					let isDataValid = validation.isImportDataValid(req, req.body, contentModels);

					if (isDataValid.isDataValid) {
						response.sendLog(req, 'Import data and content models comparision ok...');
						response.sendLog(req, 'Starting import...');
						importData.importData(req, res);
					} else {
						response.send(res, 400, isDataValid.message);
					}
				})
				.catch((error) => {
					response.send(res, error.statusCode, error.error.message);
				});
		})
		.catch((error) => {
			response.send(res, error.statusCode, error.error.message);
		});	
});

// Blueprint endpoint
router.get('/:projectId/blueprint/:format/:contentModel', (req, res) => {

	// Get all content models
	requestPromise(request.getContentModelsOptions(req))
	.then((contentModels) => {	
		blueprint.renderBlueprint(req, res, contentModels.types);
	})
	.catch((error) => {
		response.send(res, error.statusCode, error.error.message);
	});
});

router.use('/:projectId', (req, res) => {
	response.send(res, 405, 'Unsupported type of request.');
});

module.exports = router;