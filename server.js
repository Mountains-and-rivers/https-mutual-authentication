var tls = require('tls');
var fs = require('fs');

var options = {
    key: fs.readFileSync('./nginx/private/server-key.pem'),
    cert: fs.readFileSync('./nginx/certs/server.cer'),

    // This is necessary only if using the client certificate authentication.
    requestCert: true,
    passphrase: '78324*&HE@lk',
    rejectUnauthorized: true,
    // This is necessary only if the client uses the self-signed certificate.
    ca: [ fs.readFileSync('./nginx/certs/ca.cer') ]
};

var server = tls.createServer(options, function(cleartextStream) {
    console.log('server connected', cleartextStream.authorized ? 'authorized' : 'unauthorized');
    cleartextStream.write('this message is come from server!');
    cleartextStream.setEncoding('utf8');
    cleartextStream.pipe(cleartextStream);
    cleartextStream.on('data', function(data) {
        console.log(data);
    });
});
server.listen(8000, function() {
    console.log('server bound');
});