/* Comment for Hello World */
console.log("Extracting metadata from movie file...");

var fileName = '/Volumes/Movies/Transformers - Dark of the Moon/Transformers - Dark of the Moon-preset.mp4';
var exec = require('child_process').exec;
var cmd = 'ffprobe -i "' + fileName + '" -v quiet -print_format json -show_format -show_streams -hide_banner';

var fs = require('fs');
var walk = require('walk');
var files = [];

var walker = walk.walk('/Volumes/Movies', { followLinks: false });

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files

    files.push(root + '/' + stat.name);
    next();
});

walker.on('end', function() {
    console.log(files);
});

exec(cmd, function(error, stdout, stderr) {
	//console.log(stdout);

	fs.appendFile("movies.csv", 'Movie Name, Audio Streams\n');

	var obj = JSON.parse(stdout);

    fs.appendFile("movies.csv", fileName + ',');
	for (var i = 0; i < obj.streams.length; i++) {

		var stream = obj.streams[i];
        if (stream.codec_type === 'audio') {
            console.log(stream.codec_name);

			fs.appendFile("movies.csv", stream.codec_name + ' :: ', function(err) {
                if (err) {
                    console.log("EREWRWERWERWER");
                }

                console.log("File written successfully.");
            });

        }

        fs.appendFile('\n');
	}

});
