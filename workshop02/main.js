const range = require('express-range')
const compression = require('compression')

const express = require('express')

const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

const db = CitiesDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'zips', 
	collectionName: 'city'
});

const app = express();

app.set('etag', false);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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



// TODO GET /api/state/:state
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


// TODO GET /api/city/:cityId
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

// TODO POST /api/city
app.post('/api/city', (req, res) => {

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
