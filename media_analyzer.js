#!/usr/bin/env node

/**
 * Process files in a directory and subdirectories and write video and audio metadata to a csv file.
 *
 * References:
 *      node-walk: https://git.daplie.com/Daplie/node-walk
 */

var execSync = require('child_process').execSync;
var fs = require('fs');
var walk = require('walk');

var files = [];
var outputFileName = '';
var sourceDirectory = '';

processCommandLineArgs(process.argv);

var outputFile = fs.createWriteStream(outputFileName, {defaultEncoding : 'utf8'});
outputFile.write('Movie Name, Container Type, File Size, Duration, Audio Streams, Audio Channels, Video Codec, Video Dimensions, Bit Rate, Disc Type, File Name\r\n');

var walker = walk.walk(sourceDirectory, { followLinks: false });
walker.on('file', function(root, stat, next) {
    files.push(root + '/' + stat.name);
    next();
});

console.log("Extracting metadata from movie file...");
walker.on('end', function() {
    for (var i = 0; i < files.length; i++) {
        var fileExtension = files[i].split('.').pop();
        if (fileExtension != 'mp4' && fileExtension != 'mkv') {
            // This is not a media file, skip.
            continue;
        }

        var movieName = files[i].split('/').pop().split('.')[0];

        try {
            outputFile.write(movieName + ',');
            outputFile.write(fileExtension + ',');

            var cmd = 'ffprobe -i "' + files[i] + '" -v quiet -print_format json -show_format -show_streams -hide_banner';
            var output = execSync(cmd).toString();
            processFile(files[i], output);

            outputFile.write(files[i]);
        }
        catch(err) {
            console.error("Error processing " + files[i] + ":: " + err);
        }

        outputFile.write('\r\n');
    }

    outputFile.end();
});


function processFile(fileName, commandOutput) {
    console.log("Processing file " + fileName);

    // Uncomment this line if you want to see the json output of the ffprobe command.
    console.log(commandOutput);

    var obj = JSON.parse(commandOutput);

    var fileSize = humanFileSize(obj.format.size, true);
    outputFile.write(fileSize + ",");

    var duration = ((String)(obj.format.duration)).toHHMMSS();
    outputFile.write(duration + ",");

    var audioStreams = [];
    var videoStreams = [];

    // Sort the streams into audio and video
    for (var i = 0; i < obj.streams.length; i++) {
        var stream = obj.streams[i];
        if (stream.codec_type === 'audio') {
            audioStreams.push(stream);
        }

        if (stream.codec_type === 'video') {
            videoStreams.push(stream);
        }
    }

    processAudioStreams(audioStreams, outputFile);
    processVideoStreams(videoStreams, outputFile, obj);
}

/**
 * Process the audio streams from the input file and write the associated metadata to the csv.
 * @param audioStreams
 * @param outputFile
 */
function processAudioStreams(audioStreams, outputFile) {
    // Process the audio streams
    var audioField = '"';
    var channelField = '"';
    for (var i = 0; i < audioStreams.length; i++) {
        audioField += audioStreams[i].codec_name + "\r";
        channelField += '(' + audioStreams[i].channels + ') ' + audioStreams[i].channel_layout + "\r";
    }

    // Remove the last separator and write the audio stream type to our file.
    audioField = audioField.substring(0, audioField.length - 1);
    audioField += '"';
    outputFile.write(audioField);
    outputFile.write(',');

    // Remove the last separator and write the channel layout to our file.
    channelField = channelField.substring(0, channelField.length - 1);
    channelField += '"';
    outputFile.write(channelField);
    outputFile.write(',');
}

/**
 * Process the video streams from the input file and write the associated metadata to the csv.
 *
 * @param videoStreams
 * @param outputFile
 */
function processVideoStreams(videoStreams, outputFile, ffprobeJson) {
    // Process the video streams
    var videoField = '"';
    var videoDimensions = '"';
    var videoBitRate = ffprobeJson.format.bit_rate;
    var discType = dvdOrBluRay(videoStreams[0]);
    for (var i = 0; i < videoStreams.length; i++) {
        videoField += videoStreams[i].codec_name + "\r";
        videoDimensions += videoStreams[i].coded_width + "x" + videoStreams[i].coded_height + '\r';
    }

    // Remove the last separator and write the video format to our file.
    videoField = videoField.substring(0, videoField.length - 1);
    videoField += '"';
    outputFile.write(videoField);
    outputFile.write(",");

    // Remove the last separator and write the video dimensions to our file.
    videoDimensions = videoDimensions.substring(0, videoDimensions.length - 1);
    videoDimensions += '"';
    outputFile.write(videoDimensions);
    outputFile.write(",");

    // Write the bit rate to our file.
    outputFile.write(videoBitRate);
    outputFile.write(",");

    outputFile.write(discType + ",");
}

/**
 * Process and validate command line args
 *
 * @param args
 */
function processCommandLineArgs(args) {
    // Start with index 2 because 0 and 1 are the node command and source file.
    for (var i = 2; i < args.length; i++) {
        switch(args[i]) {
            case '-f':
                outputFileName = args[i+1];
                break;
            case '-d':
                sourceDirectory = args[i+1];
                break;
            case '-h':
            case '--help':
                printUsageMessage();
                process.exit(0);
        }
    }

    if (!outputFileName) {
        printUsageMessage();
        console.error("No output file specified.");
        process.exit(1);
    }

    if (!sourceDirectory) {
        printUsageMessage();
        console.error("No source directory specified.");
        process.exit(1);
    }
}

/**
 * Print the usage message.
 *
 */
function printUsageMessage() {
    console.log("usage: media_analyzer.js -d <source_directory> -f <output_file>");
    console.log("           -d <source_directory> Directory to scan for media files.");
    console.log("           -f <output_file> CSV file for media data.")
    console.log("");
}

/**
 * Borrowed with appreciation from SO user mpen: http://stackoverflow.com/a/14919494
 *
 * @param bytes
 * @param si
 * @returns {string}
 */
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}

/**
 * Determine if a video stream was DVD or Blu-ray (BD)
 *
 * @param videoStream
 * @return 'DVD' or 'BD'
 */
function dvdOrBluRay(videoStream) {
    // This is probably not the best way, but it's good enough for now.
    if (videoStream.coded_width < 1080) {
        return 'DVD';
    }
    else {
        return 'BD';
    }
}

/**
 * Borrowed with apprecation from SO user powtac: http://stackoverflow.com/a/6313008
 *
 * @returns {string}
 */
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}


