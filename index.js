/**
 * Process files in a directory and subdirectories and write audio metadata to a csv file.
 *
 * References:
 *  node-walk: https://git.daplie.com/Daplie/node-walk
 */
console.log("Extracting metadata from movie file...");

var execSync = require('child_process').execSync;

var fs = require('fs');
var outputFile = fs.createWriteStream('movies.csv', {defaultEncoding : 'utf8'});
outputFile.write('Movie Name, Container Type, Audio Streams, Video Codec\r\n');

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
        if (fileExtension != 'mp4' && fileExtension != 'mkv') {
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

        outputFile.write('\r\n');
    }

    outputFile.end();
});


function processFile(fileName, commandOutput) {
    //console.log(commandOutput);
    console.log("Processing file " + fileName);

    var obj = JSON.parse(commandOutput);

    var audioStreams = [];
    var videoStreams = [];

    // Sort the streams into audio and video
    for (var i = 0; i < obj.streams.length; i++) {
        var stream = obj.streams[i];
        if (stream.codec_type === 'audio') {
            console.log(stream.codec_name);
            audioStreams.push(stream);
        }

        if (stream.codec_type === 'video') {
            console.log(stream.codec_name);
            videoStreams.push(stream);
        }
    }

    // Process the audio streams
    var audioField = '"';
    for (var i = 0; i < audioStreams.length; i++) {
        audioField += audioStreams[i].codec_name + "\r";
    }

    // Remove the last separator and write this out to our file.
    audioField = audioField.substring(0, audioField.length - 1);
    audioField += '"';
    outputFile.write(audioField);

    // Write the csv field separator
    outputFile.write(',');

    // Process the video streams
    var videoField = '';
    for (var i = 0; i < videoStreams.length; i++) {
        videoField += videoStreams[i].codec_name + "::";
    }

    // Remove the last separator and write this out to our file.
    videoField = videoField.substring(0, videoField.length - 2);
    outputFile.write(videoField);
}