var express = require('express');
var router = express.Router();
var request = require('request');
var async = require('async');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/api/accumulateUserRetation', function (req, res) {
    res.send('ok');

    var days = ["2016.08.20", "2016.08.21", "2016.08.22", "2016.08.23"];
    var counts = [];

    async.eachSeries(days, function (day, callback) {
        var column = [];
        getNewUserForDay(day, function (err, newUsers) {
            async.eachSeries(days, function (day, inner_callback) {
                var activeCount = 0;

                async.eachSeries(newUsers, function (user, user_callback) {
                    userActiveInDay(user, day, function (err, active) {
                        if (active) {
                            activeCount++;
                        }
                        user_callback();
                    });
                }, function () {
                    column.push(activeCount);
                    inner_callback();
                });
            }, function () {
                counts.push(column);
                callback();
            });
        });
    }, function () {
        // 打印
        console.log("\t" + days.join("\t"));
        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            console.log(day + "\t" + counts[i].join("\t"));
        }
    });
});

function getNewUserForDay(day, cb) {

    var params = {
        "query": {
            "bool": {
                "must": [
                    {
                        "match": {
                            "verb": "POST"
                        }
                    },
                    {
                        "match": {
                            "request": "/api/v2/signup"
                        }
                    }
                ]
            }
        },
        "_source": ["auth"]
    };

    request.post({
        url: "http://localhost:9200/logstash-" + day + "/_search",
        body: JSON.stringify(params)
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);

            var users = [];
            if (info && info.hits && info.hits.hits) {
                for (var i = 0; i < info.hits.hits.length; i++) {
                    var hit = info.hits.hits[i];
                    users.push(hit._source.auth);
                }
            }
            cb(null, users);
        }
        else {
            cb("error");
        }
    });
}

function userActiveInDay(user, day, cb) {
    var params = {
        "query": {
            "match": {
                "auth.raw": user
            }
        }
    };

    request.post({
        url: "http://localhost:9200/logstash-" + day + "/_search",
        body: JSON.stringify(params)
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);

            var exist = (info && info.hits && info.hits.hits && info.hits.hits.length > 0);
            cb(null, exist);
        }
        else {
            cb("error");
        }
    });
}

function getActiveUserForDay(day, cb) {
    var params = {
        "query": {
            "bool": {
                "must_not": [
                    {
                        "match": {
                            "auth.raw": '"-"'
                        }
                    }
                ]
            }
        },
        "_source": ["auth"]
    };

    request.post({
        url: "http://localhost:9200/logstash-" + day + "/_search",
        body: JSON.stringify(params)
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);

            var users = [];
            if (info && info.hits && info.hits.hits) {
                for (var i = 0; i < info.hits.hits.length; i++) {
                    var hit = info.hits.hits[i];
                    users.push(hit._source.auth);
                }
            }
            cb(null, users);
        }
        else {
            cb("error");
        }
    });
}

module.exports = router;
