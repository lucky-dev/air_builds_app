var https = require("https")
var express = require("express")
var dateFormat = require('dateformat')
var fs = require("fs")
var path = require('path')
var plist = require('plist')

var HOST = process.env.HOST
var PORT = process.env.PORT
var BUILDS_DIR = process.env.BUILDS_DIR

var app = express()

app.use('/files', express.static('builds'))

app.get("/", function (req, res) {
	res.send("Air Builds (v 1.0)")
})

app.get("/udid", function(req, res) {
	var body =
	"<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
	"<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">" +
	"<plist version=\"1.0\">" +
    	"<dict>" +
        	"<key>PayloadContent</key>" +
        	"<dict>" +
            		"<key>URL</key>" +
            		"<string>https://" + HOST + ":" + PORT + "/udid/details</string>" +
            		"<key>DeviceAttributes</key>" +
            		"<array>" +
                		"<string>UDID</string>" +
                		"<string>PRODUCT</string>" +
            		"</array>" +
        	"</dict>" +
        	"<key>PayloadOrganization</key>" +
        	"<string>dev.pitch.ventures</string>" +
        	"<key>PayloadDisplayName</key>" +
        	"<string>Profile Service</string>" +
        	"<key>PayloadVersion</key>" +
        	"<integer>1</integer>" +
        	"<key>PayloadUUID</key>" +
        	"<string>C56BFABF-69DC-4592-857D-34F42B0B1C62</string>" +
        	"<key>PayloadIdentifier</key>" +
        	"<string>ventures.pitch.dev.profile-service</string>" +
        	"<key>PayloadDescription</key>" +
        	"<string>This temporary profile will be used to find and display your current device's UDID.</string>" +
        	"<key>PayloadType</key>" +
        	"<string>Profile Service</string>" +
    	"</dict>" +
	"</plist>"

	res.writeHead(200, {
                "Content-Type": "application/x-apple-aspen-config"
        })

        res.write(Buffer.from(body))
        res.end()
})

app.post("/udid/details", function(req, res) {
	var data = ""
    	req.setEncoding("utf8")
    	req.on("data", function(chunk) {
       		data += chunk
    	})

    	req.on("end", function() {
		var result = /<plist[\w\W]*\/plist>/.exec(data)
		var json = plist.parse(result[0])
		var timestamp = dateFormat(new Date(), "mm-dd-yyyy HH:MM:ss") 

		fs.appendFile('udid_devices.db', timestamp + "\t" + json.PRODUCT + "\t" + json.UDID + "\n", function(err) {
		})

		res.send("OK")
    	})
})

app.get("/builds/:projectName?", function (req, res) {
	var projectName = req.params.projectName

	if (projectName == undefined) {
		fs.readdir(BUILDS_DIR, { withFileTypes: true }, function(err, files) {
			var body = "<center><font size=\"18\">"

			files.forEach(function(file) {
				if (file.isDirectory()) {
					body += "<a href=\"/builds/" + file.name + "\">" + file.name + "</a><br/>"
				}
			})

			body += "</font></center>"

			res.send(body)
		})
	} else {
		fs.readdir(BUILDS_DIR + "/" + projectName, { withFileTypes: true }, function(err, files) {
			builds = files.map(function (file) {
					return { file: file,
					 	 birthtime: fs.statSync(BUILDS_DIR + "/" + projectName + "/" + file.name).birthtime.getTime() }
				}).sort(function (a, b) {
					return b.birthtime - a.birthtime
				}).map(function (file) {
					return file
				})

			var body = "<center><font size=\"18\"><ul>"

			builds.forEach(function(build) {
				if (!build.file.isDirectory()) {
					var fileProperties = path.parse(build.file.name)
					if (fileProperties.ext == ".ipa") { 
						var fileComponents = fileProperties.name.split("_")
						var fileBirthtime = dateFormat(build.birthtime, "mm-dd-yyyy")
						var name = fileComponents[0] + " " + fileComponents[2] + " (" + fileComponents[3] + ") - " + fileBirthtime
						body += "<li><a href=\"itms-services://?action=download-manifest&url=https://dev.pitch.ventures:8080/download/" + projectName + "/" + fileProperties.name + ".plist\">" + name + "</a></li>"
					}
				}
			})

			body += "</ul></font></center>"

			res.send(body)
		})
	}
})

app.get("/download/:projectName/:plistMetadata", function(req, res) {
	var projectName = req.params.projectName

	var fileComponents = path.parse(req.params.plistMetadata).name.split("_")

	var appName = fileComponents[0]
	var bundleId = fileComponents[1]
	var appVersion = fileComponents[2]
	var buildNumber = fileComponents[3]

	var fileName = appName + "_" + bundleId + "_" + appVersion + "_" + buildNumber 

	var body =
	"<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
	"<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">" +
	"<plist version=\"1.0\">" +
	"<dict>" +
        	"<key>items</key>" +
        	"<array>" +
                	"<dict>" +
                        	"<key>assets</key>" +
                        	"<array>" +
                                	"<dict>" +
                                        	"<key>kind</key>" +
                                        	"<string>software-package</string>" +
                                        	"<key>url</key>" +
                                        	"<string>https://" + HOST + ":" + PORT + "/files/" + projectName + "/" + fileName + ".ipa</string>" +
                                	"</dict>" +
                                	"<dict>" +
                                        	"<key>kind</key>" +
                                        	"<string>display-image</string>" +
                                        	"<key>url</key>" +
                                        	"<string>https://" + HOST +":" + PORT + "/files/" + projectName + "/icon_57x57.png</string>" +
                                	"</dict>" +
                                	"<dict>" +
                                        	"<key>kind</key>" +
                                        	"<string>full-size-image</string>" +
                                        	"<key>url</key>" +
                                        	"<string>https://" + HOST + ":" + PORT + "/files/" + projectName + "/icon_512x512.png</string>" +
                                	"</dict>" +
                        	"</array>" +
                        	"<key>metadata</key>" +
                        	"<dict>" +
                                	"<key>bundle-identifier</key>" +
                                	"<string>" + bundleId + "</string>" +
                                	"<key>bundle-version</key>" +
                                	"<string>" + appVersion + "</string>" +
                                	"<key>kind</key>" +
                                	"<string>software</string>" +
                                	"<key>title</key>" +
                                	"<string>" + appName + "</string>" +
                        	"</dict>" +
                	"</dict>" +
        	"</array>" +
	"</dict>" +
	"</plist>"

	res.writeHead(200, {
      		"Content-Type": "application/octet-stream"
    	})

	res.write(Buffer.from(body))
	res.end()
})

var options = {
	key: fs.readFileSync(process.env.SSL_CERT_KEY_NAME_LOCATION),
	cert: fs.readFileSync(process.env.SSL_CERT_LOCATION)
};

https.createServer(options, app).listen(PORT)
