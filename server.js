// Dependencies and bootstrap
var http = require('http');
var url = require('url');
var server = http.createServer();
var socket = require('socket.io'); //for log output to web-client
var fs = require('fs'); //for checking existance of secondary script
var path = require('path'); //for getting script and rundir of secondary scripts path
//for running secondary server
var childProcess = require('child_process');
var nodespawn;

// CONFIG
var secondary_script = "-"; // what script to run as secondary server, not set by default
var static_file_whitelist = [
	"/html/index.html", 
	"/css/main.css",
	"/js/main.js",
	"/js/socket.io.js",
	"/js/jquery-1.8.3.min.js",
];

// MAIN
var own_top_dir = __dirname; //top directory for the system

server.on('request', request_function );
server.listen(8080);
console.log('strike server listening on 8080...');

//attach socket.io
var io = socket.listen(server);
var clients_online = [];
io.sockets.on('connection', function (client){
	console.log('IO - client connected');
	//save client to array for later referencing
	clients_online.push(client);
	//send current used paths to new client
	var scriptDir = path.dirname(secondary_script);
	var baseScript = path.basename(secondary_script);
	client.emit('secondary_script',  {baseScript: baseScript, scriptDir: scriptDir});
});

// FUNCTIONS

//starts the secondary node.js server
function start_secondary(){
	//verify script/file exists before attempting to start
	fs.stat(secondary_script, function(err, stats){
		if(err){
			console.log('ERROR: starting secondary with file: '+secondary_script+' msg: '+err);
		}
		else{
			if(stats.isFile()){
				var scriptDir = path.dirname(secondary_script);
				var baseScript = path.basename(secondary_script);
				emitter('secondary_script', {baseScript: baseScript, scriptDir: scriptDir});
				// Start secondary node.js server and attach listeners to its output
				nodespawn = childProcess.spawn(
					'/usr/local/bin/node', [secondary_script, scriptDir]);
				nodespawn.on('exit', function (code, signal) {
					console.log('Child process exited with exit code '+code +' and signal ' +signal);
				});
				nodespawn.stdout.on('data', function (data) {
					console.log('stdout: ' + data);
					emitter('messages', {output: "stdout: " +data});
				});
				nodespawn.stderr.on('data', function (data) {
					console.log('stderr: ' + data);
					emitter('messages', {output: "stderr: " +data});
				});
			}
		}
	});
}

//emits a message to all socket.io connected clients
function emitter(subject, message){
	clients_online.forEach(function(client){
			var clientID = client['id'];
			console.log("Emitter: emitting to:" + clientID);
			client.emit(subject, message);
		});
}

function request_function(request, response){
	//router lvl 1 - query/command or file request
	var data = url.parse(request.url)
	//console.log(data); //output complete data object
	//console.log('got request: ' + data.query);
	if(data.query){
		request_query_handler(data, response);
	}
	else{
		request_file_handler(data, response);
	}
}

function request_file_handler(data, response){
	//router lvl 2 - file serving (html, css, js)
	console.log("file requested: " + data.path);
	var path = data.path;
	//empty requests get set to /index.html
	if(path == '' || path == '/' || path == 'index.html'){
		path = '/html/index.html';
	}
	//check requests/file against whitelist
	if(static_file_whitelist.indexOf(path) > -1){
		var fullpath = own_top_dir+path;
		serve_static_file(fullpath, response);
	}
	else{
		response.writeHead(404);
		response.end("File not available - whitelist block");
	}
}

function serve_static_file(fullpath, response){
	//check file exists
	fs.stat(fullpath, function(err, stats){
		if(err){
			console.log('ERROR: serving file: '+fullpath+' :'+err);
			respond(response, 404,"File read error: "+data.path, "error");
		}
		else{
			if(stats.isFile()){
				fs.readFile(fullpath, function(err, data){
					var headers;
					var matched = fullpath.match(/\.[a-z]{2,4}$/);
						switch(matched[0]){
							case '.html':
							headers = {'Content-Type':'text/html'};
							break;
							case '.css':
							headers = {'Content-Type':'text/css'};
							break;
							case '.js':
							headers = {'Content-Type':'text/javascript'};
							break;
							default:
							headers = {'Content-Type':'text/plain'};
							break;
						}
						response.writeHead(200, headers);
						response.end(data);
					});
			}
			else{
				respond(response, 404, "Request is not a file: "+data.path, "error");
			}
		}
	});
}

function request_query_handler(data, response){
	//router lvl 2 - query/command handler
	console.log('got request: ' + data.query);
	var query_parts = data.query.split("=");
	//super basic request routing
	switch(query_parts[0]){
		case 'restart': 
		restart_secondary(response);
		break;
		case 'newscript':
		set_newscript(response, query_parts[1]);
		break;
		default:
		respond(response, 400, "Bad command/query", true);
		break;
	}		
}

function set_newscript(response, data){
	console.log("newscript: "+data);
	//rough sanity check, just check if its a file
	fs.stat(data, function(err, stats){
		if(err){
			console.log('ERROR: changing to new script: '+err);
			respond(response, 200,"Bad file provided: "+data, "error");
		}else{
			console.log(stats);
			if(stats.isFile()){
				secondary_script = data;
				respond(response, 200, "Changed secondary to script: "+secondary_script);
				var scriptDir = path.dirname(secondary_script);
				var baseScript = path.basename(secondary_script);
				emitter("secondary_script", {baseScript: baseScript, scriptDir: scriptDir});
			}
		}
	});
}

function restart_secondary(response){
	if(nodespawn && nodespawn.pid){
		nodespawn.kill('SIGTERM');
	}
	start_secondary();
	respond(response, 200,'secondary restarted');
}

function respond(response, code, msg, error){
	response.writeHead(code, {
		"Content-Type": "text/html",
	});
	if(error){
		response.write('<b>Control: </b><font color="red">ERROR; </font>'+msg);
	}
	else{
		response.write('<b>Control: </b>'+msg);
	}
	response.end();	
}
