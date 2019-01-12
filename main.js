// _functionName = nested function

console.log("Last Updated 26-12-2018")

google.charts.load('current', {packages: ['corechart']});
google.charts.load('current', {'packages':['corechart', 'controls']});
google.charts.setOnLoadCallback(EnableSubmitButton);

var submitButton = document.getElementById("submit-file"); // submit button
var selectedFile = document.getElementById("open-file"); // choose file button
var startDemo = document.getElementById("start-demo-file"); // submit button
var showEmojiImageTable = document.getElementById("emoji-table-replace");

var statusDisplay = {
    main: document.getElementById("status-display"),
    chartService: document.getElementById("status-googlechart-load"),
    analysing: document.getElementById("status-analysing"),
    complete: document.getElementById("status-complete")
};


var Conversation = {};
var Participants = [];

var TimeArrays = {
    // For day and month, override subData so all possible values are present
    'Day': ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    'Month': ["January","February","March","April","May","June","July", "August","September","October","November","December"]
};

var timeDisplay = "Hours"
var fullDateDisplay = "Months"

var wordsDisplay = 15;
var wordsLengthMin = 1;
var wordsLengthMax = 20;

var emojisDisplay = 20;

var messageLengthsDisplay = 0;

var latin_map = {
    "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u", "À": "A", "È": "E",
    "Ì": "I", "Ò": "O", "Ù": "U", "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
    "ý": "y", "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ý": "Y", "â": "a",
    "ê": "e", "î": "i", "ô": "o", "û": "u", "ð": "o", "Â": "A", "Ê": "E", "Î": "I",
    "Ô": "O", "Û": "U", "Ð": "D", "ã": "a", "ñ": "n", "õ": "o", "Ã": "A", "Ñ": "N",
    "Õ": "O", "ä": "a", "ë": "e", "ï": "i", "ö": "o", "ü": "u", "ÿ": "y", "Ä": "A",
    "Ë": "E", "Ï": "I", "Ö": "O", "Ü": "U", "Ÿ": "Y", "å": "a", "Å": "A", "æ": "ae",
    "œ": "oe", "Æ": "AE", "Œ": "OE", "ß": "B", "ç": "c", "Ç": "C", "ø": "o", "Ø": "O",
    "¿": "?", "¡": "!"
};

var LatiniseString = Object.keys(latin_map).join('');

var mainDataCategories = ["TimeData", "MessageLengths", "WordsSent", "EmojisSent"];
var timeSubData = ["Day", "Month", "Year", "Time", "Fulldate"];

// Div Generation

BuildChartDivs();

function BuildChartDivs() {
    // Main categories
    mainDataCategories.forEach(mainCategory => {
        // Timedata subcategories
        if (mainCategory == "TimeData") {
            timeSubData.forEach(timeCategory => {
                CreateSingleChartDiv(mainCategory, timeCategory);
            });
        // No sub categories
        } else {
            CreateSingleChartDiv(mainCategory, null)
        }
    });

    InsertTableDivs();
    CreateChartButtonEvents();
    CreateTimeToggleEvents();
    InsertWordChartOptions();
    InsertMessageLengthChartOptions();
};

function CreateSingleChartDiv(mainData, subData){
    var chartContainer = document.getElementById("chart-container");

    // Main buttons + chart container

    if (subData) {
        chartContainer.innerHTML +=
            `<div class="mda-spacer"></div>
            <div id="container-${mainData}-${subData}" class="mda-chart">
                <div class="d-flex">
                    <h4 class="chart-title">No Data to Chart :(</h4>
                    <div class="btn-group ml-auto">
                        <button type="button" class="active btn btn-outline-dark btn-sm btn-normal-cols">Normal Columns</button>
                        <button type="button" class="btn btn-outline-dark btn-sm btn-stacked-cols">Stacked Columns</button>
                        <button type="button" class="btn btn-outline-dark btn-sm btn-100-cols">100% Stacked Columns</button>
                    </div>
                </div>
                <div class="d-flex d-row justify-content-center">
                    <div id="chart-${mainData}-${subData}"></div>
                </div>
            </div>`;
    } else {
        chartContainer.innerHTML +=
            `<div class="mda-spacer"></div>
            <div id="container-${mainData}" class="mda-chart">
                <div class="d-flex">
                    <h4 class="chart-title">No Data to Chart :(</h4>
                    <div class="btn-group ml-auto">
                        <button type="button" class="active btn btn-outline-dark btn-sm btn-normal-cols">Normal Columns</button>
                        <button type="button" class="btn btn-outline-dark btn-sm btn-stacked-cols">Stacked Columns</button>
                        <button type="button" class="btn btn-outline-dark btn-sm btn-100-cols">100% Stacked Columns</button>
                    </div>
                </div>
                <div class="d-flex d-row justify-content-center">
                    <div id="chart-${mainData}"></div>
                </div>
            </div>`;
    }

    if (subData == "Time" || subData == "Fulldate") {
        chartContainer.querySelector(`#container-${mainData}-${subData} div.btn-group`).classList.remove("ml-auto");
        chartContainer.querySelector(`#container-${mainData}-${subData} div.btn-group`).classList.add("ml-2");
    }

    // Subdata specific
    var parent = subData 
                ? document.getElementById(`container-${mainData}-${subData}`).querySelector("div")
                : document.getElementById(`container-${mainData}`).querySelector("div");
    
    // Adding buttons for toggling data views
    if (subData == "Time") {
        var button = document.createElement("button");
        var firstChild = parent.querySelector(".btn-group")
        button.id = "TimeToggleBtn";
        button.classList.add("btn", "btn-outline-dark", "btn-sm", "ml-auto");
        button.innerHTML = "Group by 15 minutes";
        parent.insertBefore(button, firstChild);
    } else if(subData == "Fulldate") {
        var button = document.createElement("button");
        var firstChild = parent.querySelector(".btn-group")
        button.id = "FulldateToggleBtn";
        button.classList.add("btn", "btn-outline-dark", "btn-sm", "ml-auto");
        button.innerHTML = "Group by Days";
        parent.insertBefore(button, firstChild);
    }
}

// Adding in HTML sections for charts and tables, as well as buttons. 
// Done in this way so that changes to all elements can be made easily. 
function CreateChartButtonEvents() {
    var btnNormal = document.querySelectorAll(".btn-normal-cols");
    var btnStacked = document.querySelectorAll(".btn-stacked-cols");
    var btn100 = document.querySelectorAll(".btn-100-cols");

    btnNormal.forEach(button => {
        button.addEventListener('click', function () {
            // remove active look from other button, add it to this button.
            for (const sibling of button.parentNode.children) {
                sibling.classList.remove("active");
            }
            button.classList.add("active");

            // Get the mainData and subData for passing into charting.
            var parentButton = button.parentElement.parentElement.parentElement.id; // eg container-TimeData-Day
            var [mainData, subData] = parentButton.replace("container-", '').split('-');
            var optionsOverride = {
                isStacked: false
            };
            ChartData(mainData, subData, optionsOverride);
        });
    });

    btnStacked.forEach(button => {
        button.addEventListener('click', function () {
            // remove active look from other button, add it to this button.
            for (const sibling of button.parentNode.children) {
                sibling.classList.remove("active");
            }
            button.classList.add("active");

            // Get the mainData and subData for passing into charting.
            var parentButton = button.parentElement.parentElement.parentElement.id; // eg container-TimeData-Day
            var [mainData, subData] = parentButton.replace("container-", '').split('-');
            var optionsOverride = {
                isStacked: true
            };
            ChartData(mainData, subData, optionsOverride);
        });
    });

    btn100.forEach(button => {
        button.addEventListener('click', function () {
            // remove active look from other button, add it to this button.
            for (const sibling of button.parentNode.children) {
                sibling.classList.remove("active");
            }
            button.classList.add("active");
            
            // Get the mainData and subData for passing into charting.
            var parentButton = button.parentElement.parentElement.parentElement.id; // eg container-TimeData-Day
            var [mainData, subData] = parentButton.replace("container-", '').split('-');
            var optionsOverride = {
                isStacked: 'percent'
            };
            ChartData(mainData, subData, optionsOverride);
        });
    });
}

function CreateTimeToggleEvents() {
    document.getElementById("TimeToggleBtn").addEventListener("click", function () {
        if (timeDisplay == "Minutes") {
            timeDisplay = "Hours"
            document.getElementById("TimeToggleBtn").innerHTML = "Group by 15 minutes"
        } else {
            timeDisplay = "Minutes"
            document.getElementById("TimeToggleBtn").innerHTML = "Group by Hours"
        }
        ChartData("TimeData", "Time");
    });
    
    // Fulldate toggle
    document.getElementById("FulldateToggleBtn").addEventListener("click", function () {
        if (fullDateDisplay == "Months") {
            fullDateDisplay = "Days"
            document.getElementById("FulldateToggleBtn").innerHTML = "Group by Months"
        } else {
            fullDateDisplay = "Months"
            document.getElementById("FulldateToggleBtn").innerHTML = "Group by Days"
        }
        ChartData("TimeData", "Fulldate");
    });
}

function InsertTableDivs() {
    var TableDiv = document.getElementById("container-WordsSent");

    TableDiv.innerHTML += 
    `<div id="WordsSent-dashboard" class="text-center">
        <h5><u>Filter for Words sent</u></h5>
        <div id="WordsSent-filter"></div>
        <div id="WordsSent-table"></div>
    </div>`;

    TableDiv = document.getElementById("container-EmojisSent")
    TableDiv.innerHTML += 
    `<div id="EmojisSent-dashboard" class="text-center">
        <h5><u>Filter for Emojis sent</u></h5>
        <div id="EmojisSent-filter"></div>
        <div id="EmojisSent-table"></div>
        <a href="javascript:void(0);" class="my-2" data-toggle="modal" data-target="#emoji-modal">Having trouble seeing emojis?</a>
    </div>
    <table id="emoji-image-table" class="table-sm table-striped table-bordered text-center" style="margin: auto!important;" hidden>
        <thead id="emoji-image-table-head" class="bg-primary text-light">
            <th class="px-2">Rank</th>
            <th class="px-2">Emoji</th>
        </thead>
        <tbody id="emoji-image-table-body">
        </tbody>
    </table>`;
}

function InsertWordChartOptions() {
    var parent = document.getElementById("chart-WordsSent").parentElement.parentElement
    var child = document.getElementById("chart-WordsSent").parentElement
    var node = document.createElement("div")
    node.innerHTML =
    `<p>Word length: <input id="words-min" type="number" name="quantity" value="1" class="form-control d-inline-block w-05"></input> to <input id="words-max" type="number" name="quantity" value="20" class="form-control d-inline-block w-05"> characters.</p>`;
    node.classList.add("d-flex", "flex-row-reverse", "text-right", "mt-2")
    parent.insertBefore(node, child);

    // Create change events
    var wordsMin =document.getElementById("words-min");
    var wordsMax =document.getElementById("words-max");
    wordsMin.addEventListener("change", function () {
        wordsLengthMin = parseInt(wordsMin.value)
        ChartData("WordsSent")
    });
    wordsMax.addEventListener("change", function () {
        wordsLengthMax = parseInt(wordsMax.value)
        ChartData("WordsSent")
    });
}

function InsertMessageLengthChartOptions() {
    var parent = document.getElementById("chart-MessageLengths").parentElement.parentElement
    var child = document.getElementById("chart-MessageLengths").parentElement
    var node = document.createElement("div")
    node.innerHTML =
    `<p>Chart limit: <input id="lengths-max" type="number" name="quantity" value="0" class="form-control d-inline-block w-05"> words long.</p>`;
    node.classList.add("d-flex", "flex-row-reverse", "text-right", "mt-2")
    parent.insertBefore(node, child);

    // Create change events
    var lengthMax = document.getElementById("lengths-max");

    lengthMax.addEventListener("change", function () {
        messageLengthsDisplay = Number(lengthMax.value);
        // var optionsOverride = 
        // { hAxis: {
        //     viewWindow: {
        //         max: messageLengthsDisplay
        //     }
        // }};
        ChartData("MessageLengths", null);
    });
}

// ~~~~~ Events

startDemo.addEventListener("click", function () {
    var fr = new FileReader();

    fr.onload = function () {
        var InputJSON = JSON.parse(this.result);

        AnalyseConversation(InputJSON);
    }

    fetch("./files/demofile.json") 
        .then(function(data) {
            fr.readAsText(data);
        })
        .catch(function() {
            // This is where you run code if the server returns any errors
            console.log("Oops! Didn't get demo file.")
        });
});

// Listener for "start"
submitButton.addEventListener("click", function () {
    var fr = new FileReader();

    fr.onload = function () {
        var InputJSON = JSON.parse(this.result)

        AnalyseConversation(InputJSON);
    }
    fr.readAsText(selectedFile.files[0])

    // Change status displays
    statusDisplay.analysing.removeAttribute("hidden");
    statusDisplay.complete.setAttribute("hidden", true);
});

// Listener for selecting file - display file name, turn green
selectedFile.addEventListener("change", function () {
    ChangeFileSelectLabel();
});

// Listener for clicking the link to show the backup emoji table.
showEmojiImageTable.addEventListener("click", function() {
    document.getElementById("emoji-image-table").removeAttribute("hidden");
});

// ~~~~~

function ConversationReset() {
    Conversation = {}
    Participants = [];

    Conversation._AddTimeData = function (timeData, senderName) {
        // add to person-specfic data in the participant data
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Day"], timeData["Day"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Month"], timeData["Month"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Year"], timeData["Year"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Time"]["Minutes"], timeData["Time"]["Minutes"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Time"]["Hours"], timeData["Time"]["Hours"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Fulldate"]["Days"], timeData["Fulldate"]["Days"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Fulldate"]["Months"], timeData["Fulldate"]["Months"]);

        // add to overall Conversation information
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Day"], timeData["Day"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Month"], timeData["Month"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Year"], timeData["Year"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Time"]["Minutes"], timeData["Time"]["Minutes"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Time"]["Hours"], timeData["Time"]["Hours"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Fulldate"]["Days"], timeData["Fulldate"]["Days"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Fulldate"]["Months"], timeData["Fulldate"]["Months"]);
    };

    Conversation._AddContentTypeData = function (messageType, senderName) {

        ObjectAddNewValueOrIncrement(
            this[senderName]["MessageContentTypes"],
            messageType);

        ObjectAddNewValueOrIncrement(
            this["ConversationTotals"]["MessageContentTypes"],
            messageType);
    };

    Conversation._AddWordData = function (words, senderName) {
        words.forEach(word => {
            ObjectAddNewValueOrIncrement(this[senderName]["WordsSent"], word);
            ObjectAddNewValueOrIncrement(this["ConversationTotals"]["WordsSent"], word)
        })
    };

    Conversation._AddEmojiData = function (emojis, senderName) {
        emojis.forEach(emoji => {
            ObjectAddNewValueOrIncrement(this[senderName]["EmojisSent"], emoji);
            ObjectAddNewValueOrIncrement(this["ConversationTotals"]["EmojisSent"], emoji)
        })
    };

    Conversation._AddMessageLengthData = function (messageLength, senderName) {
        ObjectAddNewValueOrIncrement(this[senderName]["MessageLengths"], messageLength);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["MessageLengths"], messageLength);
    }

};

function AnalyseConversation(inputJSON) {
    var t1 = performance.now();

    // RESET
    ConversationReset();

    // INIT
    Conversation["ConversationTitle"] = inputJSON.title;
    InitialiseConversation(inputJSON.participants);
    var t2 = performance.now();
    console.log("Init done: " + (t2-t1).toFixed(2) + " milliseconds");
    // Start filling Data
    Conversation.ConversationTotals.MessagesSentCount = inputJSON.messages.length;

    inputJSON.messages.forEach(message => {

        // ~~~ MESSAGE COUNT

        /* Add one to the sender message count.
        It is possible for the sender to have been removed 
        from the Conversation, and they will not be in the 
        participant list. This adds them to the data structure 
        in that scenario. */
        try {
            Conversation[message.sender_name]["MessagesSentCount"] += 1;
        } catch (error) {
            InitaliseParticipant(message.sender_name);
            Conversation[message.sender_name]["MessagesSentCount"] += 1;
        }

        // ~~~ TIME

        var timeData = TimeAnalysis(message.timestamp_ms);
        Conversation._AddTimeData(timeData, message.sender_name);

        // ~~~ CONTENT TYPE
        var messageType = ContentTypeAnalysis(message);
        Conversation._AddContentTypeData(messageType, message.sender_name);

        // ~~~ TEXT MESSAGES

        if (messageType === "Text Messages") {
            var messageContentArray = GetMessageContentArray(
                decodeURIComponent(escape(message.content))
            );

            // Length
            var messageLength = message.content.split(' ').length;
            Conversation._AddMessageLengthData(messageLength, message.sender_name);

            // Words
            var words = MessageWordsAnalysis(messageContentArray);
            Conversation._AddWordData(words, message.sender_name);

            // Emojis
            var emojis = MessageEmojiAnalysis(messageContentArray);
            Conversation._AddEmojiData(emojis, message.sender_name);
        }
    });

    var t3 = performance.now();
    console.log("Analysis done: " + (t3-t2).toFixed(2) + " milliseconds");

    console.log("Raw Data:", Conversation);

    document.querySelector("#analysis-results").removeAttribute("hidden");

    if (Object.keys(Conversation["ConversationTotals"]["TimeData"]["Fulldate"]).length !== 0) {
        ChartData("TimeData", "Day");
        ChartData("TimeData", "Month");
        ChartData("TimeData", "Year");
        ChartData("TimeData", "Time");
        ChartData("TimeData", "Fulldate");
    }
    if (Object.keys(Conversation["ConversationTotals"]["MessageLengths"]).length !== 0) {
        ChartData("MessageLengths");
    }
    if (Object.keys(Conversation["ConversationTotals"]["WordsSent"]).length !== 0) {
        ChartData("WordsSent");

        ChartPieData("MessagesSentCount");
        ChartPieData("WordsSentCount");

        CreateMessageTypesInfoTable();
        CreateParticipantWordInfoTable();
    }
    if (Object.keys(Conversation["ConversationTotals"]["EmojisSent"]).length !== 0) {
        ChartData("EmojisSent");
    }

    WriteConversationInfo()

    statusDisplay.analysing.setAttribute("hidden", true);
    statusDisplay.complete.removeAttribute("hidden");

    var t4 = performance.now();
    console.log("Charting done: " + (t4-t3).toFixed(2) + " milliseconds");
}

function InitialiseConversation(participants) {
    InitaliseParticipant("ConversationTotals");

    // For tracking people with the same name, even when _# is added to
    // the participants list.
    var participantNameTracker = []

    participants.forEach(participant => {

        // Initialise participants, but if their name already exists in the
        // Conversation, adjust it
        if (participantNameTracker.includes(participant.name)) {
            // Number of occurnces of that name
            var occurrences = participantNameTracker
                .filter(name => name === participant.name).length

            InitaliseParticipant(participant.name + "-" + occurrences)
        }
        else {
            InitaliseParticipant(participant.name)
        }

        participantNameTracker.push(participant.name)
    });
}

function InitaliseParticipant(participantName) {
    Participants.push(participantName);

    Conversation[participantName] = {};
    Conversation[participantName]["MessagesSentCount"] = 0;
    Conversation[participantName]["TimeData"] = {};

    Conversation[participantName]["TimeData"]["Day"] = new Object();
    Conversation[participantName]["TimeData"]["Month"] = new Object();
    Conversation[participantName]["TimeData"]["Year"] = new Object();
    Conversation[participantName]["TimeData"]["Time"] = new Object();
    Conversation[participantName]["TimeData"]["Time"]["Minutes"] = new Object();
    Conversation[participantName]["TimeData"]["Time"]["Hours"] = new Object();
    Conversation[participantName]["TimeData"]["Fulldate"] = new Object();
    Conversation[participantName]["TimeData"]["Fulldate"]["Days"] = new Object();
    Conversation[participantName]["TimeData"]["Fulldate"]["Months"] = new Object();

    Conversation[participantName]["MessageContentTypes"] = new Object();

    Conversation[participantName]["MessageLengths"] = new Object();

    Conversation[participantName]["WordsSent"] = new Object();
    Conversation[participantName]["EmojisSent"] = new Object();
}

function TimeAnalysis(timestamp) {
    // takes a timestamp input and creates a datetime object
    var messageDateTime = new Date(timestamp);

    // time data, a structure containing the time information about each message. 
    var timeData = {};

    // get the day, month and year of each message
    timeData["Day"] = TimeArrays["Day"][messageDateTime.getDay()]; // day of the week (Words)
    timeData["Month"] = TimeArrays["Month"][messageDateTime.getMonth()]; // month (wprds)
    timeData["Year"] = messageDateTime.getFullYear(); // year

    // get the time of the message so it is always in HH:MM form. Also round the minutes to the users preference (to the hour, or in 10m blocks)
    var hours = messageDateTime.getHours(); // hour 0-23
    var minutes = messageDateTime.getMinutes(); // minutes 0-59
    minutes = _RoundMinutes(minutes);
    // Timedata is stored as a date so that tooltip formatting can be used in google charts.
    // 'Timeofday' is a valid format but its options are more limited.
    timeData["Time"] = {};
    timeData["Time"]["Minutes"] = new Date(2018, 1, 1).setHours(hours, minutes, 0, 0);
    timeData["Time"]["Hours"] = new Date(2018, 1, 1).setHours(hours, 0, 0, 0);

    // Full Time - set hours of day to zero so that each message only has date information
    var date = new Date(timestamp).setHours(1, 0, 0, 0);
    timeData["Fulldate"] = {};
    timeData["Fulldate"]["Days"] = date;
    timeData["Fulldate"]["Months"] = new Date(date).setDate(1);

    function _RoundMinutes(minutes) {
        // Round minutes to 10 min blocks
        if (String(minutes).length == 1) {
            return "00";
        }
        else {
            return minutes.toString()[0] + "0";
        }
    }

    return timeData;
}

function ContentTypeAnalysis(message) {
    if (message.sticker) {
        return "Stickers";
    }
    else if (message.videos) {
        return "Videos";
    }
    else if (message.photos) {
        return "Photos";
    }
    else if (message.files) {
        return "Files";
    }
    else if (message.gifs) {
        return "GIFs";
    }
    else if (message.share || message.type == "Share") {
        return "Shared Links";
    }
    else if (message.audio_files) {
        return "Audio Files";
    }
    else if (message.plan) {
        return "Plan (linked date/time)";
    }
    else if (message.content) {
        return "Text Messages";
    }
    else {
        return "Link to External Site";
    }
}

function GetMessageContentArray(content) {
    // facebooks emoticons shortcuts (only used for old messages)
    var fixedContent = content.replace(/( :\))/g, " 🙂 ")
        .replace(/( <\("\))/g, " 🐧 ")
        .replace(/( :\()/g, " 😞 ")
        .replace(/( :\/)/g, " 😕 ")
        .replace(/( :P)/g, " 😛 ")
        .replace(/ :D/g, " 😀 ")
        .replace(/ :o/g, " 😮 ")
        .replace(/ ;\)/g, " 😉 ")
        .replace(/ B-\)/g, " 😎 ")
        .replace(/ >:\(/g, " 😠 ")
        .replace(/ :'\(/g, " 😢 ")
        .replace(/ 3:\)/g, " 😈 ")
        .replace(/ O:\)/gi, " 😇 ")
        .replace(/ :\*/g, " 😗 ")
        .replace(/<3/g, " ❤ ")
        .replace(/\^_\^/g, " 😊 ")
        .replace(/-_-/g, " 😑 ")
        .replace(/ >:O/gi, " 😠 ")
        .replace(/\(y\)/gi, " 👍 ");

    /* uses regex to replace certain patterns. All punctuation, including
    space-apostrophe/apostrophe-space patterns also removes punctuation and
    symbols not in words */

    return fixedContent
        .toLowerCase()
        .replace(/['"]\s+/g, '') // apostrophe space
        .replace(/\s+['"]/g, '') // space apostrophe
        .replace(/[.,/\\#!$%^&*;:{}=\-_`"~()[\]@?+><]/g, '') // punctuation
        .replace(/\s+/g, ' ') // multiple spaces
        .split(' ');
}

function MessageEmojiAnalysis(content) {
    // ~~~~~ EMOJIS ~~~~~

    // Doesn't contain a valid char - meaning contents is ONLY an emoji
    var emojiCharacters = new RegExp("[^\\w‘’“”'" + LatiniseString + "]", "g");

    // match anything that contains something that IS NOT an alphanumeric 
    // charater or apostophe (i.e. must be an emoji)
    var messageAllEmojis = content
        .filter(n => n.match(emojiCharacters));

    // array used to store INDIVIDUAL emojis sent. Eg 3 hearts in a row 
    // become 3 induvidual hearts
    var messageEmojisSent = [];

    // use emoji splitter tool to split by emojis. 
    var splitter = new GraphemeSplitter();

    messageAllEmojis.forEach(word => {
        // split emojis and other characters
        var splitwords = splitter.splitGraphemes(word);
        // remove other characters, only leaving emojis
        var emojis = splitwords.filter(n => n.match(emojiCharacters));
        // add them to the emoji list
        emojis.forEach(emoji => {
            if (escape(unescape(encodeURIComponent(emoji))).match(/%E2%9D%A4/gi)) {
                emoji = "❤";
            }
            messageEmojisSent.push(emoji);
        })
    })

    return messageEmojisSent;
}

function MessageWordsAnalysis(content) {
    // ~~~~~ WORDS ~~~~~

    var regularCharacters = new RegExp("[\\w‘’“”'" + LatiniseString + "]", "g");

    // Doesn't contain a valid char - meaning contents is ONLY an emoji
    var emojiCharacters = new RegExp("[^\\w‘’“”'" + LatiniseString + "]", "g");

    /* Match anthing that DOES CONTAIN an alphanumeric character or apostrophe. 
    this unfiltered list will still contain words that have emojis at the 
    start/end with no space in between. */
    var messageWordsUnfiltered = content
        .filter(n => n.match(regularCharacters));

    // Remove the emojis so just the word is left.
    var messageWordsSent = [];

    messageWordsUnfiltered.forEach(word => {
        messageWordsSent.push(
            word.replace(emojiCharacters, '')
        );
    })

    // remove empty entries, if there are any. 
    messageWordsSent = messageWordsSent.filter(function (e) { return e });

    return messageWordsSent;
}

// ~~~~~ Charting ~~~~~

function ChartData(mainData, subData = null, optionsOverride = null) {
    var data = new google.visualization.DataTable();
    var colours = palette('mpn65', Participants.length);
    var styles = [];
    var ctx; // location for chart (set later)
    var view; // Google charts DataView, initialised later

    // First column setup
    if (subData == "Time") {
        data.addColumn('datetime', 'Time');
    } 
    else if(subData == "Fulldate"){
        data.addColumn('date','Date')
    }
    else if(mainData == "MessageLengths"){
        data.addColumn('number', 'Length');
    }
    else { // day/ month/year
        var displayName = GetColumnDisplayName(mainData, subData);
        data.addColumn('string', displayName);
    }
    
    // Add other columns. Format:
    // [Series1] [Series1 Style] [Series2] [Series2 Style]...
    var stylesIndex = 0;

    // Conv totals always grey
    colours.unshift("6d6d6d");
    Participants.forEach(participant =>{
        // Add styles for each series using the colours generated from palette()
        styles.push(
            'fill-color:'+ colours[stylesIndex]+
            ';fill-opacity: 0.6;'+
            'stroke-color:'+ colours[stylesIndex]+
            ';stroke-width: 0.5;');
        // Add columns for participants, and style them induvidually
        data.addColumn('number', participant);
        data.addColumn({type:'string', role:'style'});

        stylesIndex++;
    });

    if (subData) {

        // Add to TimeArrays object depending on the data collected.
        SetTimeArrays(mainData, subData);

        // ~~~ Adding datarows ~~~
        TimeArrays[subData].forEach(element => {
            var newRow = [];
            // Column 1: Data counted
            if(subData == "Time" || subData == "Fulldate") {
                newRow.push(new Date(Number(element)));
            }
            else{
                newRow.push(String(element));
            }

            // Other columns: [Data][Style] [Data][Style] [Data][Style]
            stylesIndex = 0;
            Participants.forEach(participant => {
                // Even Columns: Participant data
                if (subData == "Time") {
                    newRow.push(Conversation[participant][mainData][subData][timeDisplay][element]);
                }
                else if (subData == "Fulldate") {
                    newRow.push(Conversation[participant][mainData][subData][fullDateDisplay][element]);
                }
                else{
                    newRow.push(Conversation[participant][mainData][subData][element]);
                }
                // Odd Columns: Participant Style
                newRow.push(styles[stylesIndex]);

                stylesIndex++;
            });
            data.addRow(newRow);
        });

        // Format tooltips depending on the time. 
        try {
            GetTooltipFormat(subData).format(data, 0);
        } catch (error) {
            console.log("No tooltip formatting required for " + subData + ".")
        }

        // Set the location for the chart
        ctx = document.getElementById("chart-" + mainData + "-" + subData);
    }
    else { // No subData -> Means only mainData needs to be analysed
        // ~~~ Adding datarows ~~~
        var messageData = Object.keys(Conversation["ConversationTotals"][mainData]);

        if (mainData == "MessageLengths") {
            messageData = ArrayString2Number(messageData);
            var maxLength = Math.max(...messageData);
            // For initally setting the correct max value, and for resetting when it hits zero or less
            if (messageLengthsDisplay <= 0) {
                document.getElementById("lengths-max").value = maxLength;
            }
            messageLengthsDisplay = Number(document.getElementById("lengths-max").value);
        }
        
        /* This is a bit messy. Words, Emojis and Message lengths code is all
        fairly similar, but still different, so they each need their own
        set of code */

        for (var element of messageData) {
            var newRow = NonTimeDataRow(element, mainData, styles)
            data.addRow(newRow);
        }

        if (mainData == "WordsSent" || mainData == "EmojisSent") {  
            // Sort according to ConversationTotals
            data.sort([{column: 1, desc: true}]);

            view = new google.visualization.DataView(data);

            // Do different things depending of if Words or Emojis
            switch (mainData) {
                case "WordsSent":
                    // For words, filter by the min/max lenght specified
                    var filteredView = GetWordsFilteredRows(view);
                    // Set the rows to the display limit specified.
                    // If words availables is less than words display, show that many
                    if (view.getNumberOfRows() < wordsDisplay) {
                        view.setRows([...Array(view.getNumberOfRows()).keys()]);
                    } else {
                        view.setRows(filteredView.slice(0, wordsDisplay));
                    }
                    break;

                case "EmojisSent":
                    // If words availables is less than emojisDisplay, show that many
                    if (view.getNumberOfRows() < emojisDisplay) {
                        view.setRows([...Array(view.getNumberOfRows()).keys()]);
                        emojisDisplay = view.getNumberOfRows();
                    } else {
                        view.setRows([...Array(emojisDisplay).keys()]);
                    }
                    break;
                
                default:
                    break;
            }
        }

        // Set the location context for the chart
        ctx = document.getElementById("chart-" + mainData);
    }

    if (mainData == "WordsSent" || mainData == "EmojisSent") {
        var dashboard = new google.visualization.Dashboard(document.getElementById(mainData + "-dashboard"));
        var tableView = new google.visualization.DataView(data)
        
        if (mainData == "WordsSent") {
            var filteredView = GetWordsFilteredRows(tableView);

            tableView.setRows(filteredView);
        }

        var displayColumns = [0].concat([...
            Array(data.getNumberOfColumns()).keys()] // e.g. [0,1,2,3,4,5]
            .filter(n => n%2)); // keep odd numbers only
        
        tableView.setColumns(displayColumns);
        
        var stringFilter = new google.visualization.ControlWrapper({
            controlType: 'StringFilter',
            containerId: mainData + '-filter',
            options: {
                filterColumnIndex: 0
            }
        });

        var table = new google.visualization.ChartWrapper({
            chartType: 'Table',
            containerId: mainData + '-table',
            options: {
                showRowNumber: true,
                page: 'enable',
                pageSize: 10,
                allowHtml: true,
                cssClassNames: {
                    tableCell: 'emoji-font',
                    headerRow: 'bg-primary text-light'
                }
            }
        });

        dashboard.bind([stringFilter], [table]);
        dashboard.draw(tableView);

        // draw backup image emoji table
        if (mainData == "EmojisSent") {
            CreateEmojisImageTable(tableView);
        }
    }

    // Get options
    var options = GetChartOptions(mainData, subData, colours);

    // Loop through options passed in and add them to options, 
    // or override if they already exist.
    if (optionsOverride) {
        for (var attribute in optionsOverride) {
            options[attribute] = optionsOverride[attribute];
        }
    }

    var chartTitle = GetChartTitle(mainData, subData);
    var titleTags;
    if (subData) {
        titleTags = document.getElementById(`container-${mainData}-${subData}`).querySelector(".chart-title").innerHTML = chartTitle;
    } else {
        titleTags = document.getElementById(`container-${mainData}`).querySelector(".chart-title").innerHTML = chartTitle;
    }

    // Instantiate and draw chart, passing in the options.
    var chart = new google.visualization.ColumnChart(ctx);
    if (view) {
        // Remove ConversationTotals from being displayed
        var displayColumns = [...Array(data.getNumberOfColumns()).keys()];
        displayColumns.splice(1,1);
        view.setColumns(displayColumns);
        // Chart
        chart.draw(view, options);
    }
    else{
        // Remove Conversation totals from being displayed.
        data.removeColumn(1);
        // Chart
        chart.draw(data, options);
    }
}

function ChartPieData(mainData) {
    var ctx  = document.getElementById("chart-" + mainData)
    var data = new google.visualization.DataTable();
    var styles = [];

    // Adding Columns
    data.addColumn('string', 'Person');
    data.addColumn('number', 'Sent');
    
    // Styles
    var colours = palette('mpn65', Participants.length);

    // Adding Rows
    Participants.forEach(participant => {
        // Skip ConvTotals
        if (participant == "ConversationTotals") {
            return;
        }
        // Get data, depending on which chart to plot
        var pieData;
        if (mainData == "MessagesSentCount") {
            pieData = Conversation[participant]["MessagesSentCount"];
        } else {
            pieData = SumObjectValues(Conversation[participant]["WordsSent"]);
        }
        // Add
        data.addRow([participant, pieData]);
    });

    var options = GetChartOptions(mainData, null, colours);

    var chart = new google.visualization.PieChart(ctx);
    chart.draw(data, options);
};

function GetColumnDisplayName(mainData, subData) {
    switch (mainData) {
        case "TimeData":
            break;
        case "WordsSent":
            return "Words";
        case "EmojisSent":
            return "Emojis";
        default:
            break;
    }
    switch (subData) {
        case "Day":
            return "Day";
        case "Month":
            return "Month";
        case "Year":
            return "Year";
        default:
            break;
    }
}

function GetTooltipFormat(subData) {
    if (subData == "Time" && timeDisplay == "Minutes") {
        return new google.visualization.DateFormat({pattern: "h:mm aa"});
    }
    else if (subData == "Time" && timeDisplay == "Hours") { 
        return new google.visualization.DateFormat({pattern: "h aa"});
    }
    else if (subData == "Fulldate" && fullDateDisplay == "Months") {
        return new google.visualization.DateFormat({pattern: "MMMM, YYYY"});
    }
    else{
        return;
    }
}

function SetTimeArrays(mainData, subData) {
    switch (subData) {
        case "Day":
            // Already in timearray
            break;
        case "Month":
            // Already in timearray
            break;
        case "Year":
            // Add all years from first year to now
            var minYear = Math.min( ...Object.keys(Conversation["ConversationTotals"][mainData][subData]));
            var maxYear = Math.max( ...Object.keys(Conversation["ConversationTotals"][mainData][subData]));
            TimeArrays[subData] = [];
            for (let index = minYear; index <= maxYear; index++) {
                TimeArrays[subData].push(String(index))
            }
            break;
        case "Time":
            if (timeDisplay == "Hours") {
                TimeArrays[subData] = Object.keys(Conversation["ConversationTotals"][mainData][subData]["Hours"]);
            }
            else{
                TimeArrays[subData] = Object.keys(Conversation["ConversationTotals"][mainData][subData]["Minutes"]);
            }
            break;
        case "Fulldate":
            if (fullDateDisplay == "Days") {
                TimeArrays[subData] = Object.keys(Conversation["ConversationTotals"][mainData][subData]["Days"]);
            }
            else{
                TimeArrays[subData] = Object.keys(Conversation["ConversationTotals"][mainData][subData]["Months"]);
            }
            break;
        default:
            break;
    }
}

function NonTimeDataRow(element, mainData, styles) {
    var newRow = [];
    newRow.push(element);
    
    var stylesIndex = 0;
    Participants.forEach(participant => {
        // Even Columns: Participant data
        newRow.push(Conversation[participant][mainData][element]);
        // Odd Columns: Participant Style
        newRow.push(styles[stylesIndex]);
        stylesIndex++;
    });

    return newRow;
}

function GetChartOptions(mainData, subData, colours) {
    var options = {};
    // remove grey
    if (colours[0] == "6d6d6d") {
        colours.shift();
    }

    var containerWidth = document.getElementById("marketing-cards").offsetWidth;
    var pieChartSize = containerWidth*0.5;
    var titleFontSize = 18;

    // Setting common variables between all charts
    options.width = containerWidth*0.9;
    options.height = containerWidth*0.6;
    options.legend = { position: "bottom" };
    options.chartArea = {width: '100%', height: '80%', left:'8%'};
    options.colors = colours;

    options.hAxis = {
        baselineColor: 'transparent',
        gridlines:{
            color: 'transparent'
        },
    };

    options.vAxis = {
        minValue: 0
    };

    if (subData) {
        switch (subData) {
            case "Day":
                return options;
            case "Month":
                return options;
            case "Year":
                return options;
            case "Time":
                options.hAxis.format = 'h a'
                options.hAxis.minValue = new Date(new Date(2018, 1, 1).setHours(0, 0, 0, 0));
                options.hAxis.maxValue = new Date(new Date(2018, 1, 1).setHours(23, 59, 0, 0));
                return options;
            case "Fulldate":
                return options;
            default:
                break;
        }
    }
    else {
        switch (mainData) {
            case "MessageLengths":
                options.hAxis.viewWindow = {
                    min: 0,
                    max: messageLengthsDisplay
                };
                return options;

            case "WordsSent":
                return options;

            case "EmojisSent":
                options.hAxis.textStyle = {
                    fontName:"Segoe UI Emoji",
                    fontSize: 18
                };
                options.tooltip = {
                    textStyle:{
                        fontName: window.navigator.platform.includes("Mac") ? "Apple Color Emoji" : "Segoe UI Emoji"
                    }
                };
                return options;

            case "MessagesSentCount":
                options.width = pieChartSize*0.9;
                options.height = pieChartSize*0.6;
                options.legend = { position: ''};
                options.titleTextStyle = {
                    fontSize: titleFontSize,
                };
                return options;

            case "WordsSentCount":
                options.width = pieChartSize*0.9;
                options.height = pieChartSize*0.6;
                options.legend = { position: '' };
                options.titleTextStyle = {
                    fontSize: titleFontSize,
                };
                return options;

            default:
                break;
        }
    }
}

function GetChartTitle(mainData, subData) {
    var title;

    if (subData) {
        switch (subData) {
            case "Day":
                title = 'Messages by Day of the Week';
                return title;
            case "Month":
                title = "Messages by Month of the Year"
                return title;
            case "Year":
                title = "Messages by Year"
                return title;
            case "Time":
                title = "Messages by Time of Day, grouped by " + timeDisplay;
                return title;
            case "Fulldate":
                title = "Messages by date sent, grouped by " + fullDateDisplay;
                return title;
            default:
                break;
        }
    }
    else {
        switch (mainData) {
            case "MessageLengths":
                title = 'Lengths of Messages Sent';
                return title;
            case "WordsSent":
                title = `Top ${wordsDisplay} Words by frequency, ${wordsLengthMin} to ${wordsLengthMax} letters long`;
                return title;
            case "EmojisSent":
                title = "Top 20 Emojis by frequency";
                return title;
            case "MessagesSentCount":
                title = "Messages Sent";
                return title;
            case "WordsSentCount":
                title = "Words Sent";
                return title;
            default:
                break;
        }
    }
}

function GetWordsFilteredRows(view) {
    var filtered = view.getFilteredRows([{
        column: 0,
        test: function (value, row, column, table) {
            if (value.length >= wordsLengthMin && value.length <= wordsLengthMax) {
                return true;
            }
            else{
                return false;
            }
        }
        
    }]);

    return filtered;
}

// ~~~~~ Custom Tables ~~~~~

function CreateMessageTypesInfoTable(){
    var messageTypesInfoTable = document.getElementById("message-types-info-body");
    messageTypesInfoTable.innerHTML = "";

    Participants.forEach(participant => {
        if (participant != "ConversationTotals") {
            var textMsg = (Conversation[participant]["MessageContentTypes"]["Text Messages"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Text Messages"];
            var photos = (Conversation[participant]["MessageContentTypes"]["Photos"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Photos"];
            var videos = (Conversation[participant]["MessageContentTypes"]["Videos"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Videos"];
            var stickers = (Conversation[participant]["MessageContentTypes"]["Stickers"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Stickers"];
            var gifs = (Conversation[participant]["MessageContentTypes"]["GIFs"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["GIFs"];
            var files = (Conversation[participant]["MessageContentTypes"]["Files"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Files"];
            var shared = (Conversation[participant]["MessageContentTypes"]["Shared Links"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Shared Links"];
            var audio = (Conversation[participant]["MessageContentTypes"]["Audio Files"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Audio Files"]
            var plans = (Conversation[participant]["MessageContentTypes"]["Plan (linked date/time)"] === undefined) ? 0 : Conversation[participant]["MessageContentTypes"]["Plan (linked date/time)"]

            var rowHTML = (`<td>${participant}</td><td>${textMsg}</td><td>${photos}</td><td>${videos}</td><td>${stickers}</td><td>${gifs}</td><td>${files}</td><td>${shared}</td><td>${audio}</td><td>${plans}</td>`);

            messageTypesInfoTable.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);   
        }        
    });
};

function CreateParticipantWordInfoTable(){
    var participantWordInfoBody = document.getElementById("participant-words-info-body");
    participantWordInfoBody.innerHTML = "";

    Participants.forEach(participant => {
        if (participant != "ConversationTotals") {
            var partMessagesSent = Conversation[participant]["MessagesSentCount"];
            var partWordsSent = SumObjectValues(Conversation[participant]["WordsSent"]);

            var rowHTML = (`<td>${participant}</td><td>${partMessagesSent}</td><td>${partWordsSent}</td><td>${(partWordsSent/partMessagesSent).toFixed(2)}</td>`);

            participantWordInfoBody.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);
        }
    });
};

function CreateEmojisImageTable(view) {
    var emojisImagesTable = document.getElementById("emoji-image-table-body");
    emojisImagesTable.innerHTML = "";

    var tableHead = document.querySelector('#emoji-image-table-head>tr');
    Participants.forEach(participant => {
        tableHead.insertAdjacentHTML('beforeend', `<th class="px-2">${participant}</th>`);
    });


    for (let index = 0; index < emojisDisplay; index++) { // for each emoji in top 20
        var emoji = view.getValue(index, 0);
        var rowHTML = `<td>${index + 1}</td><td>${emojione.toImage(emoji)}</td>`;
        
        Participants.forEach(participant => {
            var participantValue = Participants.indexOf(participant) + 1 == null ? 0 : Participants.indexOf(participant) + 1;
            rowHTML += `<td>${view.getValue(index, participantValue)}</td>`;
        });

        emojisImagesTable.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);   
    }
}

// ~~~~~ Helper Functions ~~~~~

function WriteConversationInfo(){
    var totalMessages = Conversation["ConversationTotals"]["MessagesSentCount"];
    var totalWords = SumObjectValues(Conversation["ConversationTotals"]["WordsSent"]);
    var uniqueWords = Object.keys(Conversation["ConversationTotals"]["WordsSent"]).length;
    var totalEmojis = SumObjectValues(Conversation["ConversationTotals"]["EmojisSent"]);
    var uniqueEmojis = Object.keys(Conversation["ConversationTotals"]["EmojisSent"]).length;

    document.getElementById("conversation-info").innerHTML = 
    `<p><strong>Total Messages: </strong>${totalMessages.toLocaleString()}</p>
    <p><strong>Total Words: </strong>${totalWords.toLocaleString()}</p>
    <p><strong>Unique Words: </strong>${uniqueWords.toLocaleString()}</p>
    <p><strong>Total Emojis: </strong>${totalEmojis.toLocaleString()}</p>
    <p><strong>Unique Emojis: </strong>${uniqueEmojis.toLocaleString()}</p>`;
}

function ObjectAddNewValueOrIncrement(ObjectRef, keyValue) {
    if (ObjectRef[keyValue]) {
        ObjectRef[keyValue] += 1;
    }
    else {
        ObjectRef[keyValue] = 1;
    }
}

function ColorHexToRGBOpacity(hex, opacity) {
    var hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);

    return result = `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function ArrayString2Number(inpArray) {
    var retArray = []
    inpArray.forEach(element =>{
        retArray.push(Number(element));
    });
    return retArray;
}

function EnableSubmitButton() {
    var button = document.getElementById("submit-file");
    button.removeAttribute("disabled");

    statusDisplay.chartService.setAttribute("hidden", true)
}

function SumObjectValues( obj ) {
    var sum = 0;
    for (var element in obj) {
        if (obj.hasOwnProperty(element)) {
            sum += parseInt(obj[element]);
        }
    }
    return sum;
};

function ChangeFileSelectLabel() {
    document.getElementById("open-file-label").innerText = selectedFile.files[0].name;
    document.getElementById("open-file-label").classList.add("text-success");
};