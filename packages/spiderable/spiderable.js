(function () {
  var fs = __meteor_bootstrap__.require('fs');
  var spawn = __meteor_bootstrap__.require('child_process').spawn;
  var querystring = __meteor_bootstrap__.require('querystring');
  var app = __meteor_bootstrap__.app;

  // how long to let phantomjs run before we kill it
  var REQUEST_TIMEOUT = 15*1000;

  app.use(function (req, res, next) {
    if (/\?.*_escaped_fragment_=/.test(req.url) || req.headers['user-agent'].indexOf('facebookexternalhit') !== -1) {
	
	console.log('spidyz', req.url);
      // get escaped fragment out of the url.
      var idx = req.url.indexOf('?');
	
	var preQuery = '';
	if (idx !== -1) {
	    preQuery = req.url.substr(0, idx);
	}
	else {
	    preQuery = req.url;
	}
	console.log('pre', preQuery);
	var queryStr = req.url.substr(idx + 1);
	console.log('querystr', queryStr);
	var parsed = querystring.parse(queryStr);
	console.log('querystrparse', parsed);
	delete parsed['_escaped_fragment_'];
	var newQuery = querystring.stringify(parsed);
	console.log('newquery', newQuery);
	var newpath = '';
	if (idx === -1) {
	    newPath = preQuery;
	}
	else {
	    newPath = preQuery + (newQuery ? "?" + newQuery : "");    
	}
	
	var  url = "http://" + req.headers.host + newPath;
	console.log('URLZ', url);
      // run phantomjs
      //
      // Use '/dev/stdin' to avoid writing to a temporary file. Can't
      // just omit the file, as PhantomJS takes that to mean 'use a
      // REPL' and exits as soon as stdin closes.
      var cp = spawn('phantomjs', ['--load-images=no', '/dev/stdin']);

      var data = '';
      cp.stdout.setEncoding('utf8');
      cp.stdout.on('data', function (chunk) {
        data += chunk;
      });

      cp.on('exit', function (code) {
		console.log(code, /<html/i.test(data), data.length);
        if (0 === code && /<html/i.test(data)) {
          res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
          res.end(data);
        } else {
          // phantomjs failed. Don't send the error, instead send the
          // normal page.
          if (code === 127)
            Meteor._debug("spiderable: phantomjs not installed. Download and install from http://phantomjs.org/");
          else
            Meteor._debug("spiderable: phantomjs failed:", code, data.substr(0,300));

          next();
        }
      });

      // don't crash w/ EPIPE if phantomjs isn't installed.
      cp.stdin.on('error', function () {});

      cp.stdin.write(
        "var url = '" + url + "';" +
"var page = require('webpage').create();" +
"page.open(url);" +

"setInterval(function() {" +
"  var ready = page.evaluate(function () {" +
"    if (typeof Meteor !== 'undefined' && Meteor.status().connected) {" +
" var fu = document.createElement('div'); " +
" fu.innerHTML = '' + Meteor._LivedataConnection._allSubscriptionsReady(); " +
" document.getElementsByTagName('body')[0].appendChild(fu); " +
"      Meteor.flush();" +
"      return Meteor._LivedataConnection._allSubscriptionsReady()" +
"    }" +
"    return false;" +
"  });" +
"  if (ready) {" +
"    var out = page.content;" +
"    out = out.replace(/<script[^>]+>(.|\\n|\\r)*?<\\/script\\s*>/ig, '');" +
"    out = out.replace('<meta name=\"fragment\" content=\"!\">', '');" +

"    console.log(out);" +
"    phantom.exit();" +
"  }" +
"}, 100);");
      cp.stdin.end();

      // Just kill it if it takes too long.
      setTimeout(function () {
        if (cp && cp.pid) {
          cp.kill();
        }
      }, REQUEST_TIMEOUT);

    } else {
      next();
    }
  });
})();
