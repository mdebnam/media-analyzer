# media-analyzer

Traverse a directory structure and generate a csv file with all mp4/mkv video files and associated metadata in the directory tree.

Why? Because I've ripped my movie collection using a variety of Handbrake settings and I wanted to figure out what was what.

Dependencies
- Node.js
- ffmpeg, specifically the ffprobe command. This must be in your path.

CSV Fields
- Movie Name (pulled from the file name)
- Container Type (mp4 or mkv)
- File Size (in human readable format)
- Duration (hh:mm:ss)
- Audio Stream (one per line)
- Audio Channels (one per line in format (#num channels) \<encoding type\>)
- Video Codec
- Video Dimensions (WxH)
- Video Bit Rate
- Disc Type (BD or DVD)
- File Name (full path from filesystem)
