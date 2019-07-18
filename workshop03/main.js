const { join } = require('path');
const fs = require('fs');

const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const  OpenAPIValidator  = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const express = require('express')

const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

// TODO change your databaseName and collectioName 
// if they are not the defaults below
const db = CitiesDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'zips', 
	collectionName: 'city'
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO 1/2 Load schemans
const citySchema = require('./schema/city-schema.json')

new OpenAPIValidator({
	apiSpecPath: join(__dirname, 'schema', 'city-api.yaml')
}).install(app)


// Start of workshop
// Mandatory workshop
app.get('/api/states', (req, res) => {
	res.type('application/json');
	db.findAllStates()
		.then(result => {
			res.status(200);
			res.json(result);

		})
		.catch(error => {
			res.status(400); 
            res.send({ error : error }); 
            return;
		});

});

app.get('/api/state/:state', (req, res) => {

	const stateAbbr = req.params.state;

	res.type('application/json');
	db.findAllStates()
		.then(result => {

			console.log(result.indexOf(stateAbbr.toUpperCase()))
			console.log(result)
			
			if (result.indexOf(stateAbbr.toUpperCase()) < 0) {
				res.status(400); 
            	res.send({ error : `Not a valid state : ${stateAbbr}` }); 
            	return;
			}
			const params = {
				offset : parseInt(req.query.offset) || 0,
				limit : parseInt(req.query.limit) || 10
			}

			return (db.findCitiesByState(stateAbbr, params))
		}) 
		.then(result => {
			console.log(result)
			res.status(200);
			res.json(result.map(v => `/api/city/${v}`));

		})
		.catch(error => {
			res.status(400); 
            res.send({ error : error }); 
            return;
		});

});


app.get('/api/city/:cityId', (req, res) => {

	const cityId = req.params.cityId;

	res.type('application/json');
	db.findCityById(cityId)
		.then(result => {
			if (result.length > 0) {
				res.status(200);
				res.json(result[0]);
				return;
			}

			res.status(400); 
			res.send({ error : `City not found : ${cityId}` }); 
			return;
			
		})
		.catch(error => {
			res.status(400); 
            res.send({ error : error }); 
            return;
		});

});

app.post('/api/city', (req, res) => {
	schemaValidator.validate( { body : citySchema} )

	const newCity = req.body;
	res.type('application/json');
	
	db.insertCity(newCity)
		.then(result => {
			res.status(201);
			res.json(result);
			return;
		})
		.catch(error => {
			res.status(400); 
            res.send({ error : error }); 
            return;
		});

});



// Optional workshop
// TODO HEAD /api/state/:state
// TODO GET /state/:state/count
// TODO GET /city/:name



// End of workshop

app.use('/schema', express.static(join(__dirname, 'schema')));

app.use((error, req, resp, next) => {
	if (error instanceof ValidationError)
		return resp.status(400).type('application/json').json({ error: error });
	else if (error.status)
		return resp.status(400).type('application/json').json({ error: error });
	next();
});

db.getDB()
	.then((db) => {
		const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;

		console.info('Connected to MongoDB. Starting application');
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}`);
		});
	})
	.catch(error => {
		console.error('Cannot connect to mongo: ', error);
		process.exit(1);
	});
