/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    config = require('./config')
    var all_items_raw = config.init_news,
    all_items = {}, ts_base = 0.001;
var _ = require('underscore');
var overResult = [];

function gg() {
    return (new Date()).getTime();
}
for (var i = 0; i < all_items_raw.length; i++) {
    all_items[(gg() + ts_base).toString()] = all_items_raw[i];
    ts_base += 0.001; // to make the key unique
}
var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
    app.set('adminpass', config.adminpass);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

var io = require('socket.io').listen(app);
app.listen(80);
io.sockets.on('connection', function(socket) {
    socket.on('valjson', function(d) {
        resultSet = compare(d.msg, d.msg1);
        overResult = [];
        io.sockets.socket(socket.id).emit('resultjson', resultSet);
    });

    function compare(src, chk) {
        var check = filter(chk, null);
        overResult = [];
        var source = filter(src, null);
        var a = filterSort(source);
        var b = filterSort(check);
        var j = _.sortBy(_.union(checkDiff(a, b), checkDiff(b, a)), function() {
            return this.tag;
        });
        return j;
    }

    function checkDiff(loacala, localb) {
        _.each(loacala, function(loca) {
            localb = _.reject(localb, function(num) {
                return (num.tag == loca.tag && num.type == loca.type && num.parent == loca.parent);
            });

        });
        return localb;
    }

    function filterSort(obj) {
        var parentDetails = [];
        _.each(_.groupBy(obj, function(details) {
            return details.parent;
        }), function(data) {
            var uniqueTags = _.uniq(data, function(par) {
                return par.tag;
            });
            parentDetails.push(uniqueTags);
        });
        return _.flatten(parentDetails);
    }

    function filter(obj1, objDetails) {
        _.each(obj1, function(key, value) {
            var detailsList = setDetails(obj1, value, objDetails);
            overResult.push(detailsList);
            if (detailsList.type == "Array" && obj1[value].length > 0) {
                for (var i = 0; i < obj1[value].length; i++) {
                    var typeNow = Object.prototype.toString.call(obj1[value][0]).slice(8, -1);
                    if (typeNow == "Array" || typeNow == "Object") {
                        filter(obj1[value][i], value);
                    }
                }
            } else if (detailsList.type == "Object") {
                filter(obj1[value], value);
            }

        });
        return overResult;
    }

    function setDetails(obj, value, objDetails) {
        var result = {};
        result.tag = value;
        result.isNul = _.isNull(obj[value]);
        result.parent = objDetails;
        result.type = Object.prototype.toString.call(obj[value]).slice(8, -1);
        return result;
    }
});
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
