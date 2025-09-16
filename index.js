const app = require('./app')
const http = require('http');


const server = http.createServer(app);

//corriendo el servidor
server.listen(3000, () => {
  console.log('el servidor esta corriendo el puerto 3000');
  
});