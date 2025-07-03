require('dotenv').config();
const createServer = require('./server');

const port = process.env.PORT || 3001;
const flightServerUrl = process.env.FLIGHT_SERVER_URL || 'grpc://localhost:8080';

const app = createServer(flightServerUrl);

app.listen(port, () => {
  console.log(`HTTP Gateway listening at http://localhost:${port}`);
}); 