var https = require("https")
var express = require("express")
var fs = require("fs")
var multer  = require("multer")
var nodemailer = require('nodemailer')

var HOST = process.env.HOST
var PORT = process.env.PORT
var PORT_AIR_BUILDS = process.env.PORT_AIR_BUILDS
var UPLOADS_DIR = process.env.UPLOADS_DIR
var BUILDS_DIR = process.env.BUILDS_DIR
var EMAIL_USER_NOTIFY = process.env.EMAIL_USER_NOTIFY
var EMAIL_SERVICE = process.env.EMAIL_SERVICE
var EMAIL_USER_NOTIFY = process.env.EMAIL_USER_NOTIFY
var EMAIL_PASSWORD_NOTIFY = process.env.EMAIL_PASSWORD_NOTIFY

var upload = multer({ dest: UPLOADS_DIR })

var transporter = nodemailer.createTransport({
	service: EMAIL_SERVICE,
	auth: {
		user: EMAIL_USER_NOTIFY,
		pass: EMAIL_PASSWORD_NOTIFY
	}
})

var app = express()

app.get("/", function (req, res) {
	res.send("Air Builds Uploader (v 1.0)")
})

app.post("/upload", upload.single('ipa'), function (req, res) {
	var projectName = req.body.projectName
	var appName = req.body.appName
	var bundleId = req.body.bundleId
	var appVersion = req.body.appVersion
	var buildId = req.body.buildId
	var emails = req.body.emails

	if ((!appName) || (!bundleId) || (!appVersion) || (!buildId) || (!emails)) {
		res.send("Error")
	} else {
		var newAppName = appName + "_" + bundleId + "_" + appVersion + "_" + buildId + ".ipa"

		fs.copyFile(req.file.path, BUILDS_DIR + "/" + projectName + "/" + newAppName, function(err) {
			fs.unlink(req.file.path, function(err) {})

			if (err) {
		  		res.send("Error")
	  		} else {
				transporter.sendMail({
					from: "\"Air Builds\" <" + EMAIL_USER_NOTIFY + ">",
					to: emails,
					subject: "A new build",
					html: "Please click on <a href=https://" + HOST + ":" + PORT_AIR_BUILDS + "/builds/" + projectName + ">the link</a> to get " + appVersion + " (" + buildId +")"
				})

				res.send("OK")
			}
		})
	}
})

var options = {
        key: fs.readFileSync(process.env.SSL_CERT_KEY_NAME_LOCATION),
        cert: fs.readFileSync(process.env.SSL_CERT_LOCATION)
};

https.createServer(options, app).listen(PORT)
