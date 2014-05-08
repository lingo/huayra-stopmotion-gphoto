var spawn = require('child_process').spawn;
var socket = require("socket.io-client");
var tmp = require('tmp');
var path = require('path');
var fs = require('fs');

if (process.argv.length < 3) {
	console.error("Usage: gphotoclient.js <PORT> <FREQUENCY>");
	console.error(" <PORT> is port number where huayra-stopmotion is listening");
	console.error(" <FREQUENCY> is in milliseconds. A photo will be taken every FREQUENCY ms");
	process.exit(1);
}
var port = process.argv[2];
var freq = 400;
if (process.argv.length > 3) {
	freq = process.argv[3];
}


var simulationIdx = 0;

/**
 * Simulate image capture using a static file
 */
function captureImageSim(conn) {
	emitImage(conn, 'sim/guitar' + simulationIdx + '.jpg');
	if (++simulationIdx >= 5) {
		simulationIdx = 0;
	}
}

/**
 * Emit image data
 */
function emitImage(conn, filename) {
	try {
		var data = fs.readFileSync(filename);
		data = 'data:image/jpeg;base64,' + data.toString('base64');
		conn.emit('captura', {data: data});
	} catch(ex) {
		console.error(ex);
	}
}


/**
 * Configure camera
 * @todo: This needs to use an external config file to allow for easy
 *  configuration for specific cameras etc.
 */
function configureCamera(callback) {
	var config = {
		imageformat: 5,
		capturetarget: 0,
		capture: 'on'
	};
	var args = [];
	for(c in config) {
		if (config.hasOwnProperty(c)) {
			args.push('--set-config');
			args.push(c + '=' + config[c]);
		}
	}
	var proc = spawn('gphoto2', args);
	var errors = null;
	proc.stderr.on('data', function (data) {
		//console.error('configureCamera', data.toString());
		errors = data.toString();
	});
	proc.on('exit', function(code) {
		if (typeof callback === 'function') {
			callback(errors, code);
		}
	});
}


/**
 * Use gphoto2 to capture images and emit the data via websockets
 * @todo: TIDY UP a LOT and add more appropriate error handling
 */
function captureImage(conn) {
	tmp.tmpName(function _tmpnameGenerated(err, tempPath) {
		// Regexes to match gphoto output
		var rxError = /Error/gi;
		var rxSaving = /Saving file as ([^.]+)\.jpg/g;
		var rxSaved = /New file is in/g;

		var saved = null; // saved file path, extracted from gPhoto output

		var args = [ "--capture-image-and-download", "--force-overwrite", "--debug-logfile=gphoto.jpg", "--filename=" + tempPath];
		console.log('Spawn gphoto2', args);
		var dir = path.dirname(tempPath);
		var capture = spawn("gphoto2", args, { cwd: dir });

		// Listen for errors
		capture.stderr.on("data", function _stderrData(data) {
			console.error("\tError with gphoto", data.toString());
		});
		// Listen for output from gphoto
		capture.stdout.on("data", function _stdoutData(data) {
			console.log("gphoto2 >>> ");
			// code here was adapted from https://github.com/porkbuns/shmile
			dataStr = data.toString();
			if (dataStr.match(rxError)) {
				console.error('\tError with gphoto', data.toString());
			} else {
				if (dataStr.match(rxSaved)) {
					console.log("\tfinished saving image.");
				}
				saved = rxSaving.exec(dataStr);
				if (saved) {
					saved = saved[1] + '.jpg';
					console.log('\tsaving image as ', saved);
					emitImage(conn, saved);
				} else {
					console.warn("\tUnknown response from gphoto2", dataStr);
				}
			}
		});
	});
}

/**
 * Start the websockets client
 */
function startClient(captureFn) {
	var conn = socket.connect('http://localhost:' + port);
	conn.on('connect', function() {
		console.log("Connected.");
		setInterval(function _timerFn() { captureFn(conn); }, freq);
		// conn.on('capturaSuccess', function(data) {
		// 	console.log('server responded:', data);
		// });
		conn.on('disconnect', function() {
			console.log("Disconnected.", conn);
			process.exit(0);
		});
	});
	console.log('end startClient');
}


/**
 * Try to configure camera
 * In case of error, for now fallback to simulation (for debugging)
 */
configureCamera(function(err, exitCode) {
	if (err || exitCode !== 0) {
		console.error('Failed to configure camera.  GPhoto2 says: ', err);
		startClient(captureImageSim);
	} else {
		startClient(captureImage);
	}
});

