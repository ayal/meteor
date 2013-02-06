(function () {
  var urlParser = __meteor_bootstrap__.require('url');
  var querystring = __meteor_bootstrap__.require('querystring');
  var http = __meteor_bootstrap__.require('http');

  __meteor_bootstrap__.app
    .use(function(req, res, next) {
      if (req.url.indexOf('/prxy') !== -1) {
        Fiber(function () {
          var parsedUrl = urlParser.parse(req.url);
          var parsedQuery = querystring.parse(parsedUrl.query);
          var httpres = Meteor.http.get(parsedQuery['url']);
          var imgurl = urlParser.parse(parsedQuery['url']);
          console.log(imgurl);
          var options = {
            hostname: imgurl.hostname,
            port: 80,
            path: imgurl.path,
            method: 'GET'
          };

          (function doreq(optz) {
            var preq = http.request(optz, function(pres) {
              console.log('STATUS: ' + pres.statusCode);
              console.log('HEADERS: ' + JSON.stringify(pres.headers));
              
              if (pres.headers.location) {
                preq.end();
                var newurl = urlParser.parse(pres.headers.location);
                optz = {
                  hostname: newurl.hostname,
                  port: 80,
                  path: newurl.path,
                  method: 'GET'
                };
                
                doreq(optz);
                return;
              }
              console.log(_.pick(pres.headers, 'content-type'));
              res.writeHead(200, _.pick(pres.headers, 'content-type'));
              pres.setEncoding('binary');
              pres.on('data', function (chunk) {
                res.write(chunk, "binary");
              });
              pres.on('end', function(e){
                res.end();
              });

            });


            preq.on('error', function(e) {
              console.log('problem with request: ' + e.message);
            });

            // write data to request body

            preq.end();
            
          })(options);
          
        }).run();
      }
      else {
        next();   
      }
    });
})();