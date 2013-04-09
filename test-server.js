var http = require('http');
var server = http.createServer();

server.on('request', request_function );

function request_function (request, response){
	if(request.url == "/favicon.ico"){
		response.writeHead(404, {
			"Content-Type": "text/html",
		});
	}else{
		response.writeHead(200, {
			"Content-Type": "text/html",
		});
		response.write("Hello! this is secondary - Now we change it to something new, and exciting!");
		console.log("secondary got request for: "+request.url);
	}
	response.end();
}

server.listen(8081);
console.log("secondary listening on 8081");
