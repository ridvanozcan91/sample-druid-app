const express = require('express')
const bodyParser = require('body-parser')
const notes = [{
		timestamp: new Date(),
		noteId: "1",
		noteContent: "Notes 1",
	},
	{
		timestamp: new Date(),
		noteId: "2",
		noteContent: "Notes 2"
	},
]


const app = express()

app.set('view engine', 'ejs')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}))

app.get("/", function (req, res) {
	res.render("home", {
		data: notes
	})
})

async function postData(url = "", data = {}) {
	// Default options are marked with *
	const response = await fetch(url, {
		method: "POST", // *GET, POST, PUT, DELETE, etc.
		mode: "cors", // no-cors, *cors, same-origin
		cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
		credentials: "same-origin", // include, *same-origin, omit
		headers: {
			"Content-Type": "application/json",
			// 'Content-Type': 'application/x-www-form-urlencoded',
		},
		redirect: "follow", // manual, *follow, error
		referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
		body: JSON.stringify(data), // body data type must match "Content-Type" header
	});
	return response.json(); // parses JSON response into native JavaScript objects
}

app.post("/druid", (req, res) => {
	const noteContent = req.body.noteContent
	const noteId = "" + (notes.length + 1);

	const date = new Date();
	notes.push({
		timestamp: date,
		noteId: noteId,
		noteContent: noteContent,
	})

	const note = {
		timestamp: date,
		noteContent: noteContent,
	};

	const words = note.noteContent.split(' ').map(n => {return {
        timestamp: date,
        noteContent: n,
    }});

    if (words.length === 0) {
        res.render("home", {
            data: notes
        })
        return;
    }
	let druidTask = {
		type : "index_parallel",
		spec : {
			dataSchema : {
				dataSource : "assignment-ds",
				timestampSpec: {
					column: "timestamp",
					format: "iso"
				},
				dimensionsSpec : {
					dimensions : [
						"noteContent"
					]
				},
				metricsSpec : [
					{ type : "count", name : "count" }
				],
				granularitySpec : {
					type : "uniform",
					segmentGranularity : "MINUTE",
					rollup : true
				}
			},
			ioConfig : {
				type : "index_parallel",
				inputSource : {
					type : "inline",
					data : words.map(s => JSON.stringify(s)).reduce((a, b) => a + "\n" + b)
				},
				inputFormat : {
					type : "json"
				},
				appendToExisting : false
			},
			tuningConfig : {
				type : "index_parallel",
				maxRowsPerSegment : 5000000,
				maxRowsInMemory : 25000
			}
		}
	};
	postData("http://13.51.161.170:8081/druid/indexer/v1/task", druidTask).then((data) => {
		console.log(data); // JSON data parsed by `data.json()` call
	});

	res.render("home", {
		data: notes
	})
})

app.post('/update', (req, res) => {
	var noteId = req.body.noteId;
	var noteContent = req.body.noteContent;

	notes.forEach(note => {
		if (note.noteId == noteId) {
			note.noteContent = noteContent;
		}
	})
	res.render("home", {
		data: notes
	})
})

app.post('/delete', (req, res) => {
	var noteId = req.body.noteId;

	var j = 0;
	notes.forEach(note => {
		j = j + 1;
		if (note.noteId == noteId) {
			notes.splice((j - 1), 1)
		}
	})

	res.render("home", {
		data: notes
	})
})

app.listen(3000, (req, res) => {
	console.log("App is running on port 3000")
})
