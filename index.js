/**
 * Process files in a directory and subdirectories and write audio metadata to a csv file.
 */
console.log("Extracting metadata from movie file...");

var execSync = require('child_process').execSync;

var fs = require('fs');
var outputFile = fs.createWriteStream('movies.csv', {defaultEncoding : 'utf8'});
outputFile.write('Movie Name, Container Type, Audio Streams\n');

var walk = require('walk');
var files = [];

var walker = walk.walk('/Volumes/Movies', { followLinks: false });

walker.on('file', function(root, stat, next) {
    files.push(root + '/' + stat.name);
    next();
});

walker.on('end', function() {
    console.log(files);

    for (var i = 0; i < files.length; i++) {
        var fileExtension = files[i].split('.').pop();
        if (fileExtension != 'mp4' && fileExtension != 'mk4') {
            // This is not a media file, skip.
            continue;
        }

        var fileName = files[i].split('/').pop().split('.')[0];

        try {
            outputFile.write(fileName + ',');
            outputFile.write(fileExtension + ',');

            var cmd = 'ffprobe -i "' + files[i] + '" -v quiet -print_format json -show_format -show_streams -hide_banner';
            var output = execSync(cmd).toString();
            processFile(files[i], output);
        }
        catch(err) {
            console.error("Error processing " + files[i] + ":: " + err);
        }

        outputFile.write('\n');
    }

    outputFile.end();
});


function processFile(fileName, commandOutput) {
        //console.log(stdout);
        console.log("Processing file " + fileName);

        var obj = JSON.parse(commandOutput);

        for (var i = 0; i < obj.streams.length; i++) {
            var stream = obj.streams[i];
            if (stream.codec_type === 'audio') {
                console.log(stream.codec_name);
                outputFile.write(stream.codec_name + "::");
            }

        }
}