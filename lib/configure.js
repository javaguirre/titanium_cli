#!/usr/bin/env node

var fs = require('fs'),
	p = require('commander'),
	url = require('url'),
	http = require('http-get'),
	path = require('path'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	events = require('events'),
	consta = require('./constants'),
	child = null,
	props = {},
	platform = process.platform;

console.log('Configuring Titanium CLI.');
 
//This is not currently being utilized as the download method.   
/*
function downloadFile(_url, _dir) {
	if (!_url) { console.log('No url to download.'); }
	if (!_dir) { _dir = './'; }
	
	var opts = {
		host: url.parse(_url).host,
		port: 80,
		path: url.parse(_url).pathname
	};
	console.log(opts);
	var file_name = 'latest.zip';
	var file = fs.createWriteStream(_dir + file_name);
	http.get(opts, function(res) {
		res.on('data', function(data) {
	    	file.write(data);
		}).on('end', function() {
	    	file.end();
	    	console.log(file_name + ' downloaded to ' + _dir);
	    });
	});
}
*/
    
function getUserConfig() {
	// This is just effin ridiculous!
	p.prompt('Application ID Prefix [com.youcompany]:', function(val) {
		props.appIdPrefix = val;
		
		p.prompt('Default Application Publisher [YourCompany, Inc.]:', function(val) {
			props.appPublisher = val;
			
			p.prompt('Default Publisher URL [yourcompany.com]:', function(val) {
				props.appPublisherURL = val;
				
				p.prompt('Default Copyright Message [2011 YourCompany, Inc.]:', function(val) {
					props.appCopyright = val;
					process.stdin.destroy();
					console.log(JSON.stringify(props));
					fs.writeFile(props.sdkRoot + 'cli.json', JSON.stringify(props), function(err) {
						if (err) throw err;
						console.log('Saved CLI configuration');
					});
				});
			});
		});
	});
}

function mobileSDKLocator() {
	//Check to see if the Titanium Mobile SDK files exist.
	fs.readdir(props.sdkRoot, function(err, files) {
		if (err) throw err;
		if (files.length > 1) {
			console.log('Titanium SDK located!');
			getUserConfig();
		} else {
			// Download and install latest sdk
			console.log('Downloading latest Titanium SDK ..');
			
			// Need to add a check for the latest sdk. The api url has the latest sdk as 1.7.5?!?!
			var opts = {url:'http://api.appcelerator.net/p/v1/release-download?token=W4tzN4p4'};
			http.get(opts, './latest.zip', function (error, result) {
				if (error) {
					console.error(error);
				} else {
					console.log('Download complete.\nUnpacking SDK ...');
					var c = exec("unzip ./latest.zip", function(err, stdout, stderr) {
						if (err) throw err;
						console.log('SDK unpacked.');
						getUserConfig();
					});
				}
			});
		}
	});	
}

function iOSSDKLocator() {
	console.log('Locating iOS SDKs ... ');
	
	//Check the path to Apple developer tools
	//TODO: Check path for commands, add if necessary
	child = exec("xcode-select -print-path", function(err, stdout, stderr) {
		if (err) throw err;
		
		var developerPath = stdout.replace('\n','');
		//stat the developer path to make sure its a directory
		fs.stat(developerPath, function(error, stats) {
			if (error) throw error;
			if (stats.isDirectory()) {
				props.developerPath = developerPath;
				console.log('Found developer path!');
				
				//Make sure an iOS sdk exists
				var subchild = exec("xcodebuild -showsdks", function(err, stdout, stderr) {
					if (err) throw err;
					var sdkRoot = path.join(props.developerPath, 'Platforms/iPhoneSimulator.platform/Developer/SDKs');
					//stat the sdk path to make sure its a directory
					fs.stat(sdkRoot, function(error, stats) {
						if (error) throw error;
						if(stats.isDirectory()) {
							console.log('Found iOS SDKs!');
							//everything is good to go, lets check for Titanium SDKs
							mobileSDKLocator();
						}
					});
				});
			} else {
			    console.log('Could not detect a path to the Xcode folder');
			}
		});  
	});			
}

if (platform === 'darwin') {
	props.sdkRoot = consta.SDK_ROOT_PATH_MACOSX;
	props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/osx');
	props.modulesDir = path.join(props.sdkRoot, 'modules');
	iOSSDKLocator();
}

if (platform === 'linux') {
	props.sdkRoot = consta.SDK_ROOT_PATH_LINUX;
	props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk/linux');
	props.modulesDir = path.join(props.sdkRoot, 'modules');
}

if (platform === 'win32') {
	props.sdkRoot = consta.SDK_ROOT_PATH_WIN32;
	props.mobileSdkRoot = path.join(props.sdkRoot, 'mobilesdk\\win32');
	props.modulesDir = path.join(props.sdkRoot, 'modules');
}