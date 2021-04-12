"use strict";
const fs = require("fs");
var clients = [];
var net = require('net');
try{
	var request = require('request');
}
catch(err){
	console.log(err);
	console.log('Go read the damn readme. Run "npm install" or install the request module in some other way.');
	process.exit()
}

var https = require('https');
var config = {};
var diff;
var fileSize;
var diffIndex;
var charIndex;
var diffFound = false;
var charFound = false;
var changesMade = false;
var downloadURL = "";
console.log("\n\n\n");


// Loading up json files and such that you need
try{
	config = require('./config.json');
}
catch(err){
}


process.argv.shift();
process.argv.shift();
var type = "";
while(process.argv.length > 0)
{
	var input = process.argv.shift()
	if (input.startsWith("--"))
	{
		type = input.replace('--','');
	}
	else
	{
		if (type == "")
		{
			console.log('you fucked up');
			process.exit()
		}
		else
		{
			config[type] = input;
		}
	}
}



// Check and display relevant info
try{
	if(config.folder !== "" && config.folder !== undefined){
		console.log('       Song folder: ' + config.folder);
	}
	else{
		console.log('\nError: Fill in folder field');
		process.exit()
	}
	if(config.difficulty !== "" && config.characteristic !== undefined){
		console.log('   Song characteristic: ' + config.characteristic);
	}
	else{
		console.log('   Song characteristic: Standard');
	}
	if(config.difficulty !== "" && config.difficulty !== undefined){
		console.log('   Song difficulty: ' + config.difficulty);
	}
	else{
		console.log('\nError: Fill in difficulty field');
		process.exit()
	}
	if(config.port !== "" && config.port !== undefined){
	console.log('              Port: ' + config.port);
	}
	else{
		console.log('\nError: Fill in port field');
		process.exit()
	}
	if(config.password != "" && config.password !== undefined){
		console.log('          Password: ' + config.password);
	}
	else{
		config.password = "";
		console.log('          Password: no password being used');
	}
	if(config.download !== "" && config.download !== undefined){
		console.log('     Song download: ' + config.download);
		downloadURL = config.download;
	}

}
catch(err){
	console.log('config file is not formatted correctly');
	process.exit()
}


var data = fs.readFileSync('./Songs/' + config.folder + '/info.dat');

// Loading stuff
try{
	var info = loadJSON('./Songs/' + config.folder + '/info.dat');
}
catch(err){
	console.log('Could not find file: Songs/' + config.folder + '/info.dat');
	process.exit()
}
if (!config.characteristic)
{
	config.characteristic = "Standard";
}
for (var i = 0; i < info._difficultyBeatmapSets.length; i++)
{
	if (info._difficultyBeatmapSets[i]._beatmapCharacteristicName == config.characteristic)
	{
		for(var j = 0; j < info._difficultyBeatmapSets[i]._difficultyBeatmaps.length; j++)
		{
			if (info._difficultyBeatmapSets[i]._difficultyBeatmaps[j]._difficulty == config.difficulty)
			{
				diff = loadJSON('./Songs/' + config.folder + '/' + info._difficultyBeatmapSets[i]._difficultyBeatmaps[j]._beatmapFilename);
				try{
					fileSize = fs.statSync('./Songs/' + config.folder + '/' + info._songFilename);
				}catch(err)
				{
					//console.log('\nFailed to find '+info.difficultyLevels[i].audioPath+'. now using fileSize argument');
					if(!config.hasOwnProperty('fileSize'))
					{
						//console.log('could not use fileSize argument, finding from download URL');
						request({
						    url: downloadURL,
						    method: "HEAD"
							}, function(err, response, body) {

								var downloadResponse = response.headers;

								if (downloadResponse.hasOwnProperty('content-length'))
								{
									fileSize = downloadResponse['content-length'];
								}
								else
								{
									console.log('Unable to get file size. Please specify fileSize in config.json or as an argument');
									process.exit();
								}
						});
						
					}
					fileSize = config['content-length'];
					
				}
				
				diffIndex = j;
				charIndex = i;
				diffFound = true;
				break;
			}
		}
	}
}
if (diff === null)
{
	console.log('No proper difficulty found.');
	process.exit();
}
if (diffFound == false)
{
	console.log('Difficulty/Characteristic not found');
	process.exit();
}
setInterval(saveFile, 300000);//save every 5 minutes
// if(config.download === "")
// {
// 	config.download = 'none';
// }

var server = net.createServer(function(socket){
	socket.name = "wait";
	socket.send = false;
	//add new client to the list
	clients.push(socket);

	// Handle incoming messages from clients.
	socket.on('data', function (data) {

		if(socket.name == "wait")
		{
			
			if (config.password !== "" && data.toString().includes(";|;"))
			{
				console.log("attempted connection: " + data.toString().split(";|;")[1] + "\nPassword: " +data.toString().split(";|;")[0]);
				if (config.password == data.toString().split(";|;")[0])
				{
					for (var i = 0; i < clients.length; i++)
					{
						if (clients[i].name == data.toString().split(";|;")[1] || "wait" == data.toString().split(";|;")[1])
						{
							if (socket.address == clients[i].address)
							{
								console.log('duplicate from same client. Destroying old client.')
								clients[i].destroy();
								clients.splice(i, 1);
							}
							else
							{
								socket.write('dc:duplicate name');
  							clients.splice(clients.indexOf(socket), 1);
  							socket.destroy();
  							return;
							}	
						}
					}
					socket.name = data.toString().split(";|;")[1];
				// Send a nice welcome message and announce

			  	socket.write(config.folder.split('/').pop()+"::"+diffIndex*100+ charIndex+";;;"); //0
			  	socket.write(JSON.stringify(info)+";;;"); //1
			  	socket.write(info._difficultyBeatmapSets[charIndex]._difficultyBeatmaps[diffIndex]._beatmapFilename+";;;"); //2
			  	socket.write(JSON.stringify(diff)+";;;");//3
			  	socket.write(info._songFilename+";;;"+fileSize+";;;");//4 & 5
		        socket.write(downloadURL +";;;" );//6
		        socket.send = true;

				}
				else
				{
					socket.write('dc:wrong password');
					clients.splice(clients.indexOf(socket), 1);
					socket.destroy();
					return;
				}
				
			}
			else if (config.password === "")
			{
				if(data.toString().includes(";|;"))
				{
					data = data.toString().split(";|;")[1];
				}
				console.log("attempted connection: " + data);
				for (var i = 0; i < clients.length; i++)
				{
					if (clients[i].name == data || "wait" == data)
					{
						socket.write('dc:duplicate name');
						clients.splice(clients.indexOf(socket), 1);
						socket.destroy();
						return;
					}
				}
				socket.name = data.toString();
				// Send a nice welcome message and announce
			  	
			  	socket.write(config.folder.split('/').pop()+"::"+diffIndex*100+ charIndex+";;;"); //0
			  	socket.write(JSON.stringify(info)+";;;"); //1
			  	socket.write(info._difficultyBeatmapSets[charIndex]._difficultyBeatmaps[diffIndex]._beatmapFilename+";;;"); //2
			  	socket.write(JSON.stringify(diff)+";;;");//3
			  	socket.write(info._songFilename+";;;"+fileSize+";;;");//4 & 5
		        socket.write(downloadURL +";;;" );//6
		        socket.send = true;
			}
			else if (config.password !== "" && !data.toString().includes(";|;"))
			{
				socket.write('dc:password required');
				clients.splice(clients.indexOf(socket), 1);
				socket.destroy();
				return;
			}
			else
			{
				socket.write('dc:uhhh something else');
				clients.splice(clients.indexOf(socket), 1);
				socket.destroy();
				return;
			}
			console.log(socket.name + " joined the session.");
			broadcast("System:,:sy:,:"+ socket.name + " joined the session.;:;");
		}
		else
		{
			
			broadcast(data.toString(), socket);
			var commands = data.toString().split(";:;");
			for (var i = 0; i < commands.length; i++)
			{
				readMessage(commands[i]);
			}
			
		}
		
	
	});

  	// Remove the client from the list when it leaves
  	socket.on('end', function () {
  		try
  		{
  			clients.splice(clients.indexOf(socket), 1);
  			console.log(socket.name + " left the session.");
    		broadcast("System:,:sy:,:"+ socket.name + " left the session.;:;");
    		broadcast(socket.name + ":,:rc;:;");
  		}
  		catch(err)
  		{
  			console.log(err);
  		}
    	
  	});
  	socket.on('error',function () {
  		try
  		{
  			clients.splice(clients.indexOf(socket), 1);
    		broadcast("System:,:sy:,:"+ socket.name + " left the session.;:;");
    		broadcast(socket.name + ":,:rc;:;");
  		}
  		catch(err)
  		{
  			console.log(err);
  		}
    	
  	});
  	// Send a message to all clients
  	function broadcast(message, sender) {
    	clients.forEach(function (client) {
      		// Don't want to send it to sender
      		if (client === sender)
      		{
      			return;
      		} 
      		if (client.send == false)
      		{
      			return;
      		}
      		client.write(message);
	    });
  	}
});

//Get IP address




console.log('\n\n\n');
if (downloadURL === undefined || downloadURL === "")
{
	var req = request.post('https://catbox.moe/user/api.php', function (err, resp, body) {
	  	if (err) {
	    console.log(err);
	  	} else {
		  	// var downloadInfo = JSON.parse(body)
		  	downloadURL = body;
		    console.log('Download URL generated: ' + body);
			https.get('https://ifconfig.co/ip', function(res){
			    res.setEncoding('utf8');
			    
			    res.on('data', function(chunk){
			    	server.listen(config.port, '0.0.0.0');
			    	process.stdout.write("Server Started on IP address: ")
			        console.log(chunk);
			        
			    });
			    res.on('error', function(err) {
				    server.listen(config.port, '0.0.0.0');
					process.stdout.write("Server Started");
				});
			});

	  	}
	});
	var form = req.form();
	form.append('reqtype', 'fileupload');
	form.append('fileToUpload', fs.createReadStream('./Songs/'+config.folder+'/'+info._songFilename));
}else
{

	https.get('https://ifconfig.co/ip', function(res){
	    res.setEncoding('utf8');

	    res.on('data', function(chunk){
	    	server.listen(config.port, '0.0.0.0');
	    	process.stdout.write("Server Started on IP address: ")
	        console.log(chunk);
	        
	    });
	    res.on('error', function(err) {
		    server.listen(config.port, '0.0.0.0');
			process.stdout.write("Server Started");
		});

	});
	
		
}


function readMessage(message)
{
	changesMade = true;
	var type = message.split(":,:")[1];
	switch(type)
	{
		case 'an':
			try{
				addNote(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 'rn':
			try{
				removeNote(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 'ae':
			try{
				addEvent(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 're':
			try{
				removeEvent(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 'aw':
			try{
				addWall(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 'rw':
			try{
				removeWall(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		case 'ab':
			try{
				addBookmark(message.split(':,:')[2].split("|||"));
			}
			catch(err){

			}
			break;
		case 'rb':
			try{
				removeBookmark(message.split(':,:')[2].split(" "));
			}
			catch(err){

			}
			break;
		default:
			//console.log(message);
			break;
	}
}

function addNote(data)
{
	var note = stringToNote(data)
	if (!hasNull(note))
	{
		diff._notes.push(note);
	}
	
}

function removeNote(data)
{
	for (var j = diff._notes.length -1 ; j >= 0; j--)
	{
		if (sameNote(diff._notes[j],stringToNote(data)))
		{
			diff._notes.splice(j,1);
			break;
		}
	}
}
function stringToNote(data)
{
	return {_time: parseFloat(data[0]),
		_lineIndex: parseInt(data[1]),
		_lineLayer: parseInt(data[2]),
		_type: parseInt(data[3]),
		_cutDirection: parseInt(data[4])};
}
function sameNote(note1,note2)
{
	if (Math.abs(note1._time - note2._time) > 0.001)
		return false;
	if (note1._lineIndex != note2._lineIndex)
		return false;
	if (note1._lineLayer != note2._lineLayer)
		return false;
	if (note1._type != note2._type)
		return false;
	if (note1._cutDirection != note2._cutDirection)
		return false;
	return true;
}
function addEvent(data)
{
	if (data.length == 3)
	{
		var event = stringToEvent(data)
		if (!hasNull(event))
		{
			diff._events.push(event);
		}
	}
	else
	{
		var event = stringToEvent(data)
		if (!hasNull(event))
		{
			diff._BPMChanges.push(stringToBPM(data));
		}
	}
}
function removeEvent(data)
{
	if (data.length == 3)
	{
		for (var j = diff._events.length -1 ; j >= 0; j--)
		{
			
			if (sameEvent(diff._events[j],stringToEvent(data)))
			{
				diff._events.splice(j,1);
				break;
			}
		}
	}
	else
	{
		for (var j = diff._BPMChanges.length -1 ; j >= 0; j--)
		{
			
			if (sameBPM(stringToBPM(data), diff._BPMChanges[j]))
			{
				diff._BPMChanges.splice(j,1);
			}
		}
	}
}
function sameEvent(event1,event2)
{
	if (Math.abs(event1._time - event2._time) > 0.001)
		return false;
	if (event1._type != event2._type)
		return false;
	if (event1._value != event2._value)
		return false;
	return true;
}

function sameBPM(event1,event2)
{
	if (Math.abs(event1._BPM - event2._BPM) > 0.02)
		return false;
	if (Math.abs(event1._time - event2._time) > 0.001)
		return false;
	return true;
}

function stringToEvent(data)
{
	return {
		_time: parseFloat(data[0]),
		_type: parseInt(data[1]),
		_value: parseInt(data[2])
	};
}
function stringToBPM(data)
{
	return {
		_BPM:parseFloat(data[0]),
		_time:parseFloat(data[1]),
		_beatsPerBar:parseFloat(data[2]),
		_metronomeOffset:parseFloat(data[3])}
}
function addWall(data)
{
	var wall = stringToWall(data)
	if (!hasNull(wall))
	{
		diff._obstacles.push(wall);
	}
	
}

function removeWall(data)
{
	for (var j = diff._obstacles.length -1 ; j >= 0; j--)
	{
		if (sameWall(diff._obstacles[j],stringToWall(data)))
		{
			diff._obstacles.splice(j,1);
			break;
		}
	}
}

function stringToWall(data)
{
	return {_time: parseFloat(data[0]),
		_lineIndex: parseInt(data[1]),
		_type: parseInt(data[2]),
		_duration: parseFloat(data[3]),
		_width: parseInt(data[4])
	};
}

function sameWall(wall1,wall2)
{
	if (Math.abs(wall1._time - wall2._time) > 0.001)
		return false;
	if (wall1._lineIndex != wall2._lineIndex)
		return false;
	if (wall1._type != wall2._type)
		return false;
	if (Math.abs(wall1._duration - wall2._duration) > 0.001)
		return false;
	if (wall1._width != wall2._width)
		return false;
	return true;
}
function addBookmark(data)
{
	diff._bookmarks.push(stringToBookmark(data));
}

function removeBookmark(data)
{
	for (var j = diff._bookmarks.length - 1; j >= 0; j--)
	{
		if (Math.abs(diff._bookmarks[j]._time - stringToBookmark(data)._time) < 0.001)
		{
			diff._bookmarks.splice(j,1);
			break;
		}
	}
}

function stringToBookmark(data)
{
	return {
		_time: parseFloat(data[0]),
		_name: data[1]
	};
}

function saveFile()
{
	if (changesMade)
	{
		fs.writeFile('./Songs/' + config.folder + '/' + info._difficultyBeatmapSets[charIndex]._difficultyBeatmaps[diffIndex]._beatmapFilename, JSON.stringify(diff), function(err) {
			if (err)
				console.log(err);
			else
			{
				console.log ("file successfully saved.\nNote Count: "+ diff._notes.length+"\nEvent Count: "+diff._events.length);
			}
		});
	}
	changesMade = false;
	
}
	// server.getConnections(function(err,count){
	// 	console.log(count);
	// });

function disconnectSoon(socket)
{
	if(socket.name == "wait" || socket.name.length > 30)
	{
		clients.splice(clients.indexOf(socket), 1);
		socket.destroy();
		return;
	}
}

function hasNull(object)
{
	for(var key in object) {
    	if (object[key] === null)
    	{
    		try
    		{
    			console.log("null object detected at :" + object._time);
    		}
    		catch(err)
    		{
    			console.log("null object detected")
    		}
    		
    		return true;
    	}
	}
}

function loadJSON(file) {
    var data = fs.readFileSync(file);
    return JSON.parse(data);        
}