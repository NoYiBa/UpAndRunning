var db = require('./database');
var logger = require('./logger');
var httpcodes = require('./http-status-codes');
var request = require('request');

function Website(id, protocol, url) {
	this.id = id;
	this.protocol = protocol;
	this.url = url;

	Website.prototype.runCheck = function() {
		request({ url: this.protocol + '://' + this.url, headers: { 'User-Agent': 'UpAndRunning (https://github.com/MarvinMenzerath/UpAndRunning)' } }, function (error, response, body) {
			var status;
			if (response === undefined) {
				status = 'Server not found';
			} else {
				status = response.statusCode + ' - ' + httpcodes[response.statusCode];
			}

			if (status.indexOf(200) > -1 || status.indexOf(301) > -1 || status.indexOf(302) > -1) {
				// success
				db.query("UPDATE website SET status = ?, time = NOW(), ups = ups + 1, totalChecks = totalChecks + 1 WHERE id = ?;", [ status, id ], function(err, result) {
					if (err) { logger.error("Unable to save new website-status: " + err.code); } else { calcAvgAvailability(); }
				});
			} else {
				// failure
				db.query("UPDATE website SET status = ?, time = NOW(), lastFailStatus = ?, lastFailTime = NOW(), downs = downs + 1, totalChecks = totalChecks + 1 WHERE id = ?;", [ status, status, id ], function(err, result) {
					if (err) { logger.error("Unable to save new website-status: " + err.code); } else { calcAvgAvailability(); }
				});
			}
		});

		function calcAvgAvailability() {
			db.query("SELECT ((SELECT ups FROM website WHERE id = ?) / (SELECT totalChecks FROM website WHERE id = ?))*100 AS avg" , [ id, id ], function(err, rows) {
				if (err) { logger.error("Unable to calculate new website-availability: " + err.code); return; }
				var avgAvail = rows[0].avg.toFixed(2);
	
				db.query("UPDATE website SET avgAvail = ? WHERE id = ?;", [ avgAvail, id ], function(err, result) {
					if (err) { logger.error("Unable to save new website-availability: " + err.code); }
				});
			});
		};
	};
}

module.exports = Website;