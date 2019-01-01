// _functionName = nested function

console.log("Last Updated 26-12-2018")

google.charts.load('current', {packages: ['corechart']});
google.charts.setOnLoadCallback(EnabelSubmitButton);

var submitButton = document.getElementById("submitFile"); // submit button
var selectedFile = document.getElementById("openFile"); // choose file button

var Conversation = {};
var Participants = [];

    // TODO Handle messages where there are messages years apart
var TimeArrays = {
    // For day and month, override subData so all possible values are present
    'Day': ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    'Month': ["January","February","March","April","May","June","July", "August","September","October","November","December"]
};

var time_ChartDisplay = "10 Minute locks" // "Hours"

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

function ConversationReset() {
    Conversation = {}
    Participants = [];

    Conversation._AddTimeData = function (timeData, senderName) {
        // add to person-specfic data in the participant data
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Day"], timeData["Day"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Month"], timeData["Month"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Year"], timeData["Year"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Time"], timeData["Time"]);
        ObjectAddNewValueOrIncrement(this[senderName]["TimeData"]["Fulldate"], timeData["Fulldate"]);

        // add to overall conversation information
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Day"], timeData["Day"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Month"], timeData["Month"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Year"], timeData["Year"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Time"], timeData["Time"]);
        ObjectAddNewValueOrIncrement(this["ConversationTotals"]["TimeData"]["Fulldate"], timeData["Fulldate"]);
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

}

submitButton.addEventListener("click", function () {
    var fr = new FileReader();

    fr.onload = function () {
        var InputJSON = JSON.parse(this.result)

        AnalyseConversation(InputJSON);
    }
    fr.readAsText(selectedFile.files[0])
});

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
        from the conversation, and they will not be in the 
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

    // Sort Words / Emojis
    Participants.forEach(participant => {
        Conversation[participant]["WordsSentOrdered"] = ObjectSortByValue(Conversation[participant]["WordsSent"]);
        Conversation[participant]["EmojisSentOrdered"] = ObjectSortByValue(Conversation[participant]["EmojisSent"]);
    });

    var t4 = performance.now();
    console.log("Sorting words/emojis done: " + (t4-t3).toFixed(2) + " milliseconds");

    console.log("Raw Data:", Conversation);

    ChartData("TimeData", "Day");
    ChartData("TimeData", "Month");
    ChartData("TimeData", "Year");
    ChartData("TimeData", "Time");
    ChartData("TimeData", "Fulldate");

    var t5 = performance.now();
    console.log("Charting done: " + (t5-t4).toFixed(2) + " milliseconds");
}

function InitialiseConversation(participants) {
    InitaliseParticipant("ConversationTotals");

    // For tracking people with the same name, even when _# is added to
    // the participants list.
    var participantNameTracker = []

    participants.forEach(participant => {

        // Initialise participants, but if their name already exists in the
        // conversation, adjust it
        if (participantNameTracker.includes(participant.name)) {
            // Number of occurnces of that name
            var occurrences = participantNameTracker
                .filter(name => name === participant.name).length

            InitaliseParticipant(participant.name + "_" + occurrences)
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
    Conversation[participantName]["TimeData"]["Fulldate"] = new Object();

    Conversation[participantName]["MessageContentTypes"] = new Object();

    Conversation[participantName]["MessageLengths"] = new Object();

    Conversation[participantName]["WordsSent"] = new Object();
    Conversation[participantName]["EmojisSent"] = new Object();

    Conversation[participantName]["WordsSentOrdered"] = new Object();
    Conversation[participantName]["EmojisSentOrdered"] = new Object();
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
    timeData["Time"] = new Date(2018, 1, 1).setHours(hours, minutes, 0, 0);

    // Full Time - set hours of day to zero so that each message only has date information
    timeData["Fulldate"] = new Date(timestamp).setHours(1, 0, 0, 0);

    function _RoundMinutes(minutes) {

        // Round minutes based on display option

        switch (time_ChartDisplay) {
            case "10 Minute Blocks":

                if (String(minutes).length == 1) {
                    return "00";
                }
                else {
                    return minutes.toString()[0] + "0";
                }

            default:
                return "00";
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

function ChartData(mainData, subData) {
    // If subdata is passed as not null, proceed with date/time analysis
    if (subData) {
        // We dont wanna override the defaults for day / month
        if (subData != "Day" && subData != "Month") {
            TimeArrays[subData] = Object.keys(Conversation["ConversationTotals"][mainData][subData]);   
        }
        // Set the location context for the chart
        var ctx = document.getElementById("chart_" + mainData + "_" + subData);

        var data = new google.visualization.DataTable();
        var colours = palette('mpn65', Participants.length);
        var styles = [];

        // ~~~ Datatable, Columns Setup ~~~
        if (subData == "Time") {
            data.addColumn('datetime', 'Data');
        } 
        else if(subData == "Fulldate"){
            data.addColumn('date','Data')
        }
        else { // day/ month/year
            data.addColumn('string', 'Data');
        }
        // Counter for accessing styles
        var stylesIndex = 0;
        Participants.forEach(participant =>{
            if (participant == "ConversationTotals") {
                return;
            }
            // Add styles for each series using the colours generated from palette()
            styles.push('fill-color:'+colours[stylesIndex]+'; fill-opacity: 0.6; stroke-color:'+colours[stylesIndex]+'; stroke-width: 0.5;');
            // Add columns for participants, and style them induvidually
            data.addColumn('number', participant);
            data.addColumn({type:'string', role:'style'});

            stylesIndex++;
        });

        // ~~~ Adding datarows ~~~
        TimeArrays[subData].forEach(element => {
            var newRow = [];
            // Column 1: Data name, eg for Days, Monday, Tuesday, etc

            if(subData == "Time") {
                newRow.push(new Date(Number(element)));
            }
            else if(subData == "Fulldate"){
                newRow.push(new Date(Number(element)));
            }
            else{
                newRow.push(String(element));
            }

            stylesIndex = 0;
            Participants.forEach(participant => {
                if (participant == "ConversationTotals") {
                    return;
                }
                // Even Columns: Participant data
                newRow.push(Conversation[participant][mainData][subData][element]);
                // Odd Columns: Participant Style
                newRow.push(styles[stylesIndex]);
                stylesIndex++;
            });
            data.addRow(newRow);
        });

        var formatterTime = new google.visualization.DateFormat({pattern: "h aa"});
        formatterTime.format(data, 0);

        var options = {
            'title':'How Much Pizza I Ate Last Night',
            'width':947,
            'height':570,
            'colors':colours,
            legend: { position: "bottom" },
            chartArea: {width: '100%', height: '80%', left:'8%'},
            isStacked: 'percent',
            hAxis: {
                gridlines: {
                    color:'transparent'
                },
                format:'h a',
                baselineColor: 'transparent',
            },
        };

        // Instantiate and draw our chart, passing in some options.
        var chart = new google.visualization.ColumnChart(ctx);
        chart.draw(data, options);
    }
}

function EnabelSubmitButton() {
    var button = document.getElementById("submitFile");
    button.removeAttribute("disabled");
}

// ~~~~~ Helper Functions ~~~~~

function ObjectSortByValue(content) {
    return Object
        .keys(content)
        .sort(function (a, b) {
            return content[a] - content[b]
        })
        .reverse();
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

    return result = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

}

function ArrayString2Number(inpArray) {
    var retArray = []
    inpArray.forEach(element =>{
        retArray.push(Number(element));
    });
    return retArray;
}