var _ = require('lodash'),
    express = require('express'),
    cons = require('consolidate'),
    fs = require('fs'),
    moment = require('moment'),
    swig = require('swig');

var passport = require('passport'),
    util = require('util'),
    PocketStrategy = require('./pocket-strategy-passport.js');

// Pocket App token
POCKET_CONSUMER_KEY = "32449-81ca3bf1b78a3708d5cb2e00";

if (POCKET_CONSUMER_KEY === "Pocket consumer key") {
    console.log('WARNING!!! Need a pocket costumer key');
}

// Passport Set serializers
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Passport Set up
var pocketStrategy = new PocketStrategy({
    consumerKey: POCKET_CONSUMER_KEY,
    callbackURL: "http://127.0.0.1:3000/auth/pocket/callback"
}, function(username, accessToken, done) {
    process.nextTick(function() {
        return done(null, {
            username: username,
            accessToken: accessToken
        });
    });
});

passport.use(pocketStrategy);

// Express set up
var server = express();

server.configure(function() {
    server.use(express.logger());
    server.use(express.cookieParser());
    server.use(express.bodyParser());
    server.use(express.methodOverride());
    server.use(express.session({
        secret: 'keyboard cat'
    }));
    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    server.use(passport.initialize());
    server.use(passport.session());
    server.use(server.router);

    server.use('/twbs', express.static(__dirname + '/bower_components/bootstrap/dist/css'));
    server.use('/data', express.static(__dirname + '/data'));

});

swig.init({
    root: './views',
    cache: false
});

server.use(express.static('./public'));

server.engine('.html', cons.swig);
server.set('view engine', 'html');
server.set('views', './views');

/*function calculate(user, items) {
    var countByStatus = _.countBy(_.values(items.list), function(item) {
        return item.status == 0 ? 'unread' : 'read';
    });
    var countByDateAdded = _.countBy(_.values(items.list), function(item) {
        return moment.unix(item.time_added * 1).format('YYYY-MM-DD');
    });
    var countByDateRead = _.countBy(_.values(items.list), function(item) {
        if (item.time_read != 0) {
            return moment.unix(item.time_read * 1).format('YYYY-MM-DD');
        }
    });

    var countByTimeAdded = _.countBy(_.values(items.list), function(item) {
        return moment.unix(item.time_added * 1).format('hh-mm');
    });
    var countByTimeRead = _.countBy(_.values(items.list), function(item) {
        if (item.time_read != 0) {
            return moment.unix(item.time_read * 1).format('hh-mm');
        }
    });

    return {
        user: user,
        items: items,
        total: countByStatus.read + countByStatus.unread,
        read: (100 * countByStatus.read / (countByStatus.read + countByStatus.unread)).toFixed(2),
        unread: (100 * countByStatus.unread / (countByStatus.read + countByStatus.unread)).toFixed(2),
        countByStatus: countByStatus,
        countByTimeAdded: JSON.stringify(countByTimeAdded),
        countByTimeRead: JSON.stringify(countByTimeRead),
        countByDateAdded: JSON.stringify(countByDateAdded),
        countByDateRead: JSON.stringify(countByDateRead)
    };
}*/

server.get('/', function(req, res) {
    console.log('Req to / by ' + (req.user ? req.user.username : 'unknown'));
    if (req.user) {
        var jsonDownloaded = fs.existsSync(__dirname + '/data/' + req.user.username + '.json');
        if (jsonDownloaded) {
            res.render('index', {
                user: req.user
            });
        } else {
            pocketStrategy.getAllItems(req.user.accessToken, function(err, items) {
                if (err) {
                    res.send('Something went wrong');
                    return;
                }
                console.log(__dirname + '/data/' + req.user.username + '.json');
                fs.writeFileSync(__dirname + '/data/' + req.user.username + '.json', JSON.stringify(_.values(items.list)));
                res.render('index', {
                    user: req.user
                });
            });
        }

    } else {
        res.render('index', {
            user: req.user
        });
    }
});

// Passport routes for express
server.get('/auth/pocket', passport.authenticate('pocket'),
    function(req, res) {
        // If user is already log in and this url is called please readirect the user to the correct place.
        res.redirect('/');
    });

server.get('/auth/pocket/callback', passport.authenticate('pocket', {
        failureRedirect: '/login'
    }),
    function(req, res) {
        res.redirect('/');
    });

server.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

server.listen(3000);
console.log('server running at : http://127.0.0.1:3000')
