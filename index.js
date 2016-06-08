var express        = require('express');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var app            = express();
var server         = require('http').Server(app);
var fs             = require('fs');
var request        = require('request');

// set up Express
var pub = __dirname + '/public';
app.use(express.static(pub));
app.use(bodyParser.json());
app.use(methodOverride());
app.disable('etag');

var routes = {};

// run arbitrary script that happens to exist on the server
routes.runScript = function(req, res) {
  // try to find the file
  var script = req.params.script;
  fs.readFile('./scripts/' + script + '.js', 'utf8', function(err, data) {
    // bail out on error
    if (err) {
      res.status(400).send('Script not found');
    } else {
      // figure out our dates (default is last week)
      var params = {};
      if (req.query.from_date && req.query.to_date) {
        params.from_date = req.query.from_date;
        params.to_date = req.query.to_date;
      } else {
        var d = new Date();
        params.to_date = d.toISOString().slice(0,10);
        d.setDate(d.getDate() - 7);
        params.from_date = d.toISOString().slice(0,10);
      }
      // run it on mixpanel
      request.post('https://mixpanel.com/api/2.0/jql', {
        form: {
          params: JSON.stringify(params),
          script: data
        },
        auth: {
          username: process.env.MIXPANEL_SECRET,
          password: '',
          sendImmediately: false
        }
      }, function (err, httpResponseBody, body) {
        if (err) {
          res.status(400).send(err);
        } else {
          res.status(httpResponseBody.statusCode).send(body);
        }
      });
    }
  });
};

// set up the routes
app.get('/run/:script', routes.runScript);

server.listen(process.env.MIXPANEL_PORT || 4000, function() {
  console.log('Listening on port %d', server.address().port);
});
