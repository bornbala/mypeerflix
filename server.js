const http = require('http');
const torrentStream = require('torrent-stream');
const URL = require('url');

const PORT = 8000;

function streamTorrent(magnetURI, res, range) {
  const engine = torrentStream(magnetURI);

  engine.on('ready', () => {
    // Select largest video file
    const file = engine.files.reduce((a, b) => (a.length > b.length ? a : b));
    const size = file.length;
    let start = 0;
    let end = size - 1;

    // Parse range request for partial streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : end;
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    const stream = file.createReadStream({ start, end });
    stream.pipe(res);

    stream.on('close', () => engine.destroy());
    stream.on('error', () => engine.destroy());
  });

  engine.on('error', err => {
    res.statusCode = 500;
    res.end('Error loading torrent: ' + err.message);
  });
}

http.createServer((req, res) => {
  const urlParts = URL.parse(req.url, true);
  const magnet = urlParts.query.magnet;
  const range = req.headers.range;

  if (!magnet) {
    res.statusCode = 400;
    return res.end('Missing magnet parameter');
  }

  streamTorrent(magnet, res, range);
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
