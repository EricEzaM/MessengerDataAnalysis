console.log("Last Updated 14-10-2018 10:22pm")

// load google charts API
google.charts.load('current', {'packages':['corechart']});
google.charts.load('current', {packages: ['table']});
google.charts.setOnLoadCallback(enableSubmitButton);
google.charts.setOnLoadCallback(loadDataTables);

// %%%%% Initial Required information for input, output

var selectedFile = document.getElementById("openFile"); // choose file button
var submitButton = document.getElementById("submitFile"); // submit button
var testTextOutput = document.getElementById("info"); // info <p> to insert test data into

var wordsMin = document.getElementById("wordsMin");
var wordsMax = document.getElementById("wordsMax");

var messagesByDay = document.getElementById("messagesByDay");
var messagesHistory = document.getElementById("messagesHistory");

var docStatus = document.getElementById("status");

var JSONstring; // the json text that will be retrieved from the file

var participantsList = [];
var participantsListTrue = [];

// %%%%% USER CHANGABLE VARS (these are the defaults)

var wordSearch_minLength = 1;
var wordSearch_maxLength = 99;
var wordSearch_displayCount = 15;

var messageTimeDisplay = "Hours"; // round to ["Hours", "10 Minute Blocks"] 
var history_ChartDisplay = "Day"; // "Day" "Month"

var conversation = {};

var modal = document.getElementById("exampleModal");

// When the submit button is pressed, this starts the whole analysis process.
submitButton.addEventListener("click", function(){
    conversation = {};
    participantsList = [];
    participantsListTrue = [];
    testTextOutput.innerHTML = "";
    loadDataTables();

    wordSearch_minLength = parseInt(document.getElementById("wordsMin").value);
    wordSearch_maxLength = parseInt(document.getElementById("wordsMax").value);

    messageTimeDisplay = document.getElementById("messagesByDay").options[document.getElementById("messagesByDay").selectedIndex].value;
    history_ChartDisplay = document.getElementById("messagesHistory").options[document.getElementById("messagesHistory").selectedIndex].value;

    document.getElementById("emojiTableDiv").innerHTML = `<table id="emojiTable" class="table-sm table-striped table-bordered text-center"><tr id="headerRow" class="thead-light"><th>Rank</th><th>Emoji</th></tr></table>`;

    document.getElementById("participantWordInfoTable").innerHTML = `<tr id="infoHeaderRow" class="thead-light"><th class="px-2">Name</th><th class="px-2">Messages Sent</th><th class="px-2">Words Sent</th><th class="px-2">Average Words/message</th></tr>`;

    // new file reader
    var fr = new FileReader();

    fr.onload = function(){
        JSONstring = JSON.parse(this.result);

        analyseAndPlot(JSONstring);
    }
    fr.readAsText(selectedFile.files[0]);
});

function analyseAndPlot(json){
    var messages = json.messages;

    // Initialise the participants object with list of participants, message sent for each = 0
    participantsInitilize(json.participants);
    
    participantsListTrue = participantsList.slice();
    participantsListTrue.pop();

    // initialise data structure for each person that will contain conversation information
    participantsList.forEach(participant => {
        dataStructureInitialize(participant);
    });

    conversation.title = json.title;
    conversation["Conversation Totals"]["messagesSent"] = json.messages.length;

    // For each message, perform the following operations:
    messages.forEach(message => {   
        
        // add 1 to the participant's message count
        try {
            conversation[message.sender_name]["messagesSent"] += 1;
        } catch (error) {
            dataStructureInitialize(message.sender_name)
            conversation[message.sender_name]["messagesSent"] += 1;

            participantsList.push(message.sender_name);
            participantsListTrue.push(message.sender_name);
        }
        
        // get the message time information from the timestamp
        var messageTimeInformation = messageTimeAnalysis(message.timestamp_ms);

        // add to person-specfic data in the participant data
        objectAddNewValueOrIncrement(conversation[message.sender_name]["timedata"]["day"], messageTimeInformation.day);
        objectAddNewValueOrIncrement(conversation[message.sender_name]["timedata"]["month"], messageTimeInformation.month);
        objectAddNewValueOrIncrement(conversation[message.sender_name]["timedata"]["year"], messageTimeInformation.year);
        objectAddNewValueOrIncrement(conversation[message.sender_name]["timedata"]["time"], messageTimeInformation.time);
        objectAddNewValueOrIncrement(conversation[message.sender_name]["timedata"]["fulldate"], messageTimeInformation.fulldate);

        // add to overall conversation information struct
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["timedata"]["day"], messageTimeInformation.day);
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["timedata"]["month"], messageTimeInformation.month);
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["timedata"]["year"], messageTimeInformation.year);
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["timedata"]["time"], messageTimeInformation.time);
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["timedata"]["fulldate"], messageTimeInformation.fulldate);

        // message content type, added to person-specific and overall conversation data
        var thisMessageContentType = messageContentTypeAnalysis(message);
        objectAddNewValueOrIncrement(conversation[message.sender_name]["messageContentType"], thisMessageContentType);
        objectAddNewValueOrIncrement(conversation["Conversation Totals"]["messageContentType"], thisMessageContentType);

        // get count of words and emojis used, added to person-specific and overall conversation data
        if (message.content) {
            var wordsEmojisAndWordCount = messageContentAnalysis(decodeURIComponent(escape(message.content)));

            wordsEmojisAndWordCount.messageWordsFiltered.forEach(word => {
                objectAddNewValueOrIncrement(conversation[message.sender_name]["words"], word);
                objectAddNewValueOrIncrement(conversation["Conversation Totals"]["words"], word);
            })

            wordsEmojisAndWordCount.messageEmojisSent.forEach(emoji => {
                
                objectAddNewValueOrIncrement(conversation[message.sender_name]["emojis"], emoji);
                objectAddNewValueOrIncrement(conversation["Conversation Totals"]["emojis"], emoji);
            })

            objectAddNewValueOrIncrement(conversation[message.sender_name]["messageLength"], wordsEmojisAndWordCount.messageLength);
            objectAddNewValueOrIncrement(conversation["Conversation Totals"]["messageLength"], wordsEmojisAndWordCount.messageLength);
        }
    });
    
    // sort the words and emojis used by each participant by frequency
    participantsList.forEach(participant => {
        conversation[participant]["wordsOrdered"] = sortMessageContentByFrequency(conversation[participant]["words"]);
        conversation[participant]["emojisOrdered"] = sortMessageContentByFrequency(conversation[participant]["emojis"]);
    });

    console.log(conversation);

    docStatus.innerText = "Analysis Complete! If you like, change some settings and press start again or select a new file.";
    docStatus.classList.remove("alert-warning");
    docStatus.classList.add("alert-success");
    document.getElementById("waitMessage").setAttribute("hidden", true);
    document.getElementById("charts").removeAttribute("hidden");
    document.getElementById("chartToggles").removeAttribute("hidden");

    document.getElementById("info").innerHTML = 
    `<strong>Total Messages </strong>: ${conversation["Conversation Totals"]["messagesSent"]} <br> 
    <strong>Total Words </strong>: ${sumObjectValues(conversation["Conversation Totals"]["words"])} <br> 
    <strong>Unique Words </strong>: ${Object.keys(conversation["Conversation Totals"]["words"]).length} <br>
    <strong>Total Emojis </strong>: ${sumObjectValues(conversation["Conversation Totals"]["emojis"])} <br> 
    <strong>Unique Emojis </strong>: ${Object.keys(conversation["Conversation Totals"]["emojis"]).length} <br>`;

    participantsListTrue.forEach(participant => {

        var participantWordInfoTable = document.getElementById("participantWordInfoTable");

        var partMessagesSent = conversation[participant]["messagesSent"];
        var partWordsSent = sumObjectValues(conversation[participant]["words"]);

        var totalMessages = conversation["Conversation Totals"]["messagesSent"];
        var totalWords = sumObjectValues(conversation["Conversation Totals"]["words"]);

        var messagesPCT = (partMessagesSent/totalMessages*100).toFixed(2);
        var wordsPCT = (partWordsSent/totalWords*100).toFixed(2);

        var rowHTML = (`<td>${participant}</td><td>${partMessagesSent}</td><td>${partWordsSent}</td><td>${(partWordsSent/partMessagesSent).toFixed(2)}</td>`);

        participantWordInfoTable.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);
    });

    drawDayChart();
    drawMonthChart();
    drawYearChart();
    drawTimeChart();
    drawHistoricalChart();
    drawWordChart();
    drawEmojiChart();
    drawMsgLengthChart();
    drawMessagesSentChart();
    drawWordsSentChart();
    
    document.getElementById("analysisStartDiv").scrollIntoView(true);
}

function participantsInitilize(participants){
    participants.forEach(participant=> {
        participantsList.push(participant.name);
    });

    participantsList.push("Conversation Totals");
}

function dataStructureInitialize(participant){
    conversation[participant] = {};
    conversation[participant]["messagesSent"] = 0;
    conversation[participant]["timedata"] = {};    

    conversation[participant]["timedata"]["day"] = new Object();
    conversation[participant]["timedata"]["month"] = new Object();
    conversation[participant]["timedata"]["year"] = new Object();
    conversation[participant]["timedata"]["time"] = new Object();
    conversation[participant]["timedata"]["fulldate"] = new Object();

    conversation[participant]["messageContentType"] = new Object();

    conversation[participant]["messageLength"] = new Object();

    conversation[participant]["words"] = new Object();
    conversation[participant]["emojis"] = new Object();

    conversation[participant]["wordsOrdered"] = new Object();
    conversation[participant]["emojisOrdered"] = new Object();
}

function messageTimeAnalysis(timestamp) {
    // takes a timestamp input and creates a datetime object
    var messageDateTime = new Date(timestamp);

    // time data, a structure containing the time information about each message. 
    var timeData = {};

    // get the day, month and year of each message
    timeData["day"] = messageDateTime.getDay(); // day of the week 0-6
    timeData["month"] = messageDateTime.getMonth(); // month 0-11
    timeData["year"] = messageDateTime.getFullYear(); // year

    // get the time of the message so it is always in HH:MM form. Also round the minutes to the users preference (to the hour, or in 10m blocks)
    var hours = messageDateTime.getHours(); // hour 0-23
    var minutes = messageDateTime.getMinutes(); // minutes 0-59
    minutes = messageTimeAnalyisMinutesRounder(minutes);
    timeData["time"] = hours + ":" + minutes;

    // Full Time - set hours of day to zero so that each message only has date information
    timeData["fulldate"] = new Date(timestamp).setHours(1,0,0,0);

    return timeData;
}

function messageTimeAnalyisMinutesRounder(minutes){
    if (messageTimeDisplay == "10 Minute Blocks") {
        if (String(minutes).length == 1) {
            minutesRounded = "00";
        }
        else{
            minutesRounded = minutes.toString()[0] + "0";
        }
    }
    else if (messageTimeDisplay == "Hours") {
        minutesRounded = "00";
    }
    return minutesRounded;
}

function messageContentTypeAnalysis(message){
    if (message.sticker) {
        return "Stickers";
    }
    else if (message.videos) {
        return "Videos";
    }
    else if (message.photos) {
        return "Photos";
    }
    else if (message.content) {
        return "Text Messages";
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
    else{
        console.log(message);
        return "Link to External Site";
    }
}

function messageContentAnalysis(content){

    // facebooks emoticons shortcuts (only used for old messages)
    // <(")
    fixedContent = content.replace( /( :\))/g, " 🙂 ").replace(/( <\("\))/g, " 🐧 ").replace(/( :\()/g, " 😞 ").replace(/( :\/)/g, " 😕 ").replace(/( :P)/g, " 😛 ").replace(/ :D/g, " 😀 ").replace(/ :o/g, " 😮 ").replace(/ ;\)/g, " 😉 " ).replace(/ B-\)/g, " 😎 ").replace(/ >:\(/g, " 😠 ").replace(/ :'\(/g, " 😢 ").replace(/ 3:\)/g, " 😈 ").replace(/ O:\)/gi, " 😇 ").replace(/ :\*/g, " 😗 ").replace(/<3/g, " ❤ ").replace(/\^_\^/g, " 😊 ").replace(/-_-/g, " 😑 ").replace(/ >:O/gi, " 😠 ").replace(/\(y\)/gi, " 👍 ");

    // uses regex to replace certain patterns. All punctuation, including space-apostrophe/apostrophe-space patterns.
    var messageContent = fixedContent.toLowerCase().replace(/['"]\s+/g,'').replace(/\s+['"]/g,'').replace(/[.,/\\#!$%^&*;:{}=\-_`"~()[\]@?+><]/g,'').replace(/\s+/g,' ').split(' ');

    var messageLength =  content.split(' ').length;

    // ~~~~~ WORDS ~~~~~

    // Match anthing that DOES CONTAIN an alphanumeric character or apostrophe. 
    var messageWordsUnfiltered = messageContent.filter(n => n.match(/[\w‘’“”'ÅåÄäÖöÅåÆæØø]/g));
    // this unfiltered list will still contain words that have emojis at the start/end with no space in between. Remove the emojis so just the word is left.
    var messageWordsFiltered = [];
    messageWordsUnfiltered.forEach(word => {
        messageWordsFiltered.push(word.replace(/[^\w‘’“”'ÅåÄäÖöÅåÆæØø]/g,''));
    })
    // remove empty entries, if there are any. 
    messageWordsFiltered = messageWordsFiltered.filter(function(e){return e});

    // ~~~~~ EMOJIS ~~~~~

    // match anything that contains something that IS NOT an alphanumeric charater or apostophe
    var messageAllEmojis = messageContent.filter(n => n.match(/[^\w‘’“”'ÅåÄäÖöÅåÆæØø]/g));
    // array used to store INDIVIDUAL emojis sent. Eg 3 hearts in a row become 3 induvidual hearts
    var messageEmojisSent = [];
    // use emoji splitter tool to split by emojis. 
    var splitter = new GraphemeSplitter();
    messageAllEmojis.forEach(word => {
        // split emojis and other characters
        var splitwords = splitter.splitGraphemes(word);
        // remove other characters, only leaving emojis
        splitWordsAndEmojis = splitwords.filter(n => n.match(/[^\w‘’“”'ÅåÄäÖöÅåÆæØø]/g));
        // add them to the emoji list
        splitWordsAndEmojis.forEach(emoji => {

            if (escape(unescape(encodeURIComponent(emoji))).match(/%E2%9D%A4/gi)) {
                emoji = "❤";
            }
            messageEmojisSent.push(emoji);
        }) 
    })

    return {messageWordsFiltered, messageEmojisSent, messageLength};
}

function sortMessageContentByFrequency(content){

    var contentSentByFrequency = Object.keys(content).sort(function(a,b){return content[a]-content[b]}).reverse();

    return contentSentByFrequency;
}

// %%%%% PLOTTING %%%%%

graphWidth = document.getElementById("allContainer").offsetWidth*0.75;
graphHeight = document.getElementById("allContainer").offsetWidth*0.5;
titleFontSize = 18;

commonChartArea = {width: '100%', height: '80%', left:'10%'};

var dayOptions =   {title:"Messages by Day of the week",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawDayChart() {
    dayData = setTimeData("day");

    dayChart.draw(dayData, dayOptions);
}

var monthOptions =   {title:"Messages by Month of the Year",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawMonthChart() {
    monthData = setTimeData("month");

    monthChart.draw(monthData, monthOptions);
}

var yearOptions =   {title:"Messages by Year",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawYearChart() {
    yearData = setTimeData("year");

    yearChart.draw(yearData, yearOptions);
}

var timeOptions =   {title:"Messages by Time of Day",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    hAxis: {
                        format: 'HH:mm',
                    },
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawTimeChart() {
    timeData = setTimeData("time");

    timeChart.draw(timeData, timeOptions);
}

var timeOptions =   {title:"Messages by Time of Day",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    hAxis: {
                        format: 'HH:mm',
                    },
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawTimeChart() {
    timeData = setTimeData("time");

    timeChart.draw(timeData, timeOptions);
}

var historicalOptions =   {title:"Messages by All Time",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    hAxis: {
                        format: 'MM/yy',
                    },
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    },
                    hAxis:{
                        viewWindow:{
                            min: new Date(2013,1,1,1),
                            max: new Date(2014,1,1,1)
                    },
                    textStyle:{
                        fontSize: 10,
                    }}
};

function drawHistoricalChart() {
    historicalData = setTimeData("fulldate");

    var datesOb = conversation["Conversation Totals"]["timedata"]["fulldate"];
    var maxDateTS = parseInt(Object.keys(datesOb)[0]);
    var minDateTS = parseInt(Object.keys(datesOb)[Object.keys(datesOb).length-1]);

    var minDate = new Date(minDateTS);
    var maxDate = new Date(maxDateTS);

    defaultMinDate = minDate;
    defaultMaxDate = maxDate;

    historicalOptions.hAxis.viewWindow.min = minDate;
    historicalOptions.hAxis.viewWindow.max = maxDate;

    document.getElementById("histMin").value = formatDate(minDate);
    document.getElementById("histMax").value = formatDate(maxDate);

    historicalChart.draw(historicalData, historicalOptions);
}

function histChangeXAxisBounds() {
    var minDate = document.getElementById("histMin").value.split('-');
    var maxDate = document.getElementById("histMax").value.split('-');
    
    historicalOptions.hAxis.viewWindow.min = new Date(parseInt(minDate[0]), parseInt(minDate[1]), parseInt(minDate[2]));
    historicalOptions.hAxis.viewWindow.max = new Date(parseInt(maxDate[0]), parseInt(maxDate[1]), parseInt(maxDate[2]));

    historicalChart.draw(historicalData, historicalOptions);
}

function resetHistRange() {
    document.getElementById("histMin").value = formatDate(defaultMinDate);
    document.getElementById("histMax").value = formatDate(defaultMaxDate);

    histChangeXAxisBounds();
}

// main set data function

function setTimeData(timeToAnalyse) {

    var timeArray = [];
    var plotData = new google.visualization.DataTable();

    if (timeToAnalyse == "day") {
        timeArray = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];       

        // adds rows and cols to datatable

        addStandardColumns();
        dayMonthAnalysis();
    }
    else if (timeToAnalyse == "month"){
        timeArray = ["January","February","March","April","May","June","July",
        "August","September","October","November","December"];

        addStandardColumns();
        dayMonthAnalysis();
    }
    else if (timeToAnalyse == "year"){
        addStandardColumns();
        yearAnalysis();
    }
    else if (timeToAnalyse == "time"){

        plotData.addColumn('timeofday', timeToAnalyse);

        participantsListTrue.forEach(participant =>{
            plotData.addColumn('number', participant);
        })

        timeAnalysis(); // time is the only thing left
    }
    else { // fulldate
        plotData.addColumn('date', "Date");

        participantsListTrue.forEach(participant =>{
            plotData.addColumn('number', participant);
        });

        fulldateAnalysis();
    }

    function dayMonthAnalysis() {
        for (let index = 0; index < timeArray.length; index++) {
            var newRow = [timeArray[index]];
    
            for (let j = 0; j < participantsListTrue.length; j++) {
                newRow[j+1] = conversation[participantsListTrue[j]]["timedata"][timeToAnalyse][index];
            }
    
            plotData.addRow(newRow);
        }
    }

    function yearAnalysis() {
        var validYears = Object.keys(conversation["Conversation Totals"]["timedata"][timeToAnalyse]);
        
        validYears.forEach(year => {
            var newRow = [year];
    
            for (let j = 0; j < participantsListTrue.length; j++) {
                newRow[j+1] = conversation[participantsListTrue[j]]["timedata"][timeToAnalyse][year];
            }

            plotData.addRow(newRow);
        })
    }

    function timeAnalysis(){
        var validTimes = Object.keys(conversation["Conversation Totals"]["timedata"][timeToAnalyse]);

        validTimes.forEach(time => {
            hours = Number(String(time).split(':')[0]);
            mins =  Number(String(time).split(':')[1]);

            var newRow = [[hours, mins, 0]];

            for (let j = 0; j < participantsListTrue.length; j++) {
                newRow[j+1] = conversation[participantsListTrue[j]]["timedata"][timeToAnalyse][time];
            }

            plotData.addRow(newRow);
        })
    }

    function fulldateAnalysis(){
        var validDates = Object.keys(conversation["Conversation Totals"]["timedata"][timeToAnalyse]);

        validDates.forEach(date =>{

            var newRow = [];

            if (history_ChartDisplay == "Day") {
                newRow.push(new Date(Number(date)));

                for (let j = 0; j < participantsListTrue.length; j++) {
                    newRow[j+1] = conversation[participantsListTrue[j]]["timedata"][timeToAnalyse][date];
                }

            }
            else{
                var monthOnly = new Date(Number(date));
                monthOnly.setDate(1);
                monthOnly.setHours(12, 0, 0, 0);

                newRow.push(monthOnly);

                for (let j = 0; j < participantsListTrue.length; j++) {

                    var sum = 0;
                    
                    var allFullDateData = conversation[participantsListTrue[j]]["timedata"][timeToAnalyse];
    
                    for (var key in allFullDateData) {
    
                        if (allFullDateData.hasOwnProperty(key)) {
    
                            if((new Date(Number(date)).getMonth() == new Date(Number(key)).getMonth()) && (new Date(Number(date)).getFullYear() == new Date(Number(key)).getFullYear())) {
                                sum += allFullDateData[key];
                            }
                        }
                    }
    
                    newRow[j+1] = sum;
                }
            }

            plotData.addRow(newRow);
        });
    }

    function addStandardColumns(){
        plotData.addColumn('string', timeToAnalyse);

        participantsListTrue.forEach(participant =>{
            plotData.addColumn('number', participant);
        })
    }

    return plotData;
}

// word stuff

var msgLengthOptions = {title:"Messages by length (words)",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    },
                    hAxis:{
                        viewWindow:{
                            min: 0,
                            max: 100 
                        }}
};

function msgLengthChangeXAxisBounds() {
    msgLengthOptions.hAxis.viewWindow.min = parseInt(document.getElementById("msgLengthMin").value);
    msgLengthOptions.hAxis.viewWindow.max = parseInt(document.getElementById("msgLengthMax").value);

    msgLengthChart.draw(msgLengthData, msgLengthOptions);
}


function resetMsgLengthRange() {
    document.getElementById("msgLengthMin").value = 0;
    document.getElementById("msgLengthMax").value = Math.max( ...arrayString2Ints(Object.keys(conversation["Conversation Totals"]["messageLength"])));

    msgLengthChangeXAxisBounds();
}

function drawMsgLengthChart() {
    msgLengthData = new google.visualization.DataTable();

    msgLengthData.addColumn('number', 'Length');
    participantsListTrue.forEach(participant =>{
        msgLengthData.addColumn('number', participant);
    })

    validLengths = Object.keys(conversation["Conversation Totals"]["messageLength"]);

    validLengths.forEach(length => {
        var newRow = [parseInt(length)];

        for (let j = 0; j < participantsListTrue.length; j++) {
            newRow[j+1] = conversation[participantsListTrue[j]]["messageLength"][length];
        }

        msgLengthData.addRow(newRow);
    });

    // horizontal axis, set defaul values for input box
    msgLengthOptions.hAxis.viewWindow.max = Math.max(arrayString2Ints(Object.keys(conversation["Conversation Totals"]["messageLength"])));
    document.getElementById("msgLengthMin").value = 0;
    document.getElementById("msgLengthMax").value = Math.max( ...arrayString2Ints(Object.keys(conversation["Conversation Totals"]["messageLength"])));

    document.getElementById("messageLengthInfo").innerHTML = `<strong>Messages with different word lengths  </strong>: ${arrayString2Ints(Object.keys(conversation["Conversation Totals"]["messageLength"])).length}`;

    msgLengthChart.draw(msgLengthData, msgLengthOptions);
}

var wordOptions = {title:"Words by Frequency",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawWordChart() {
    wordData = new google.visualization.DataTable();

    wordData.addColumn('string', 'Word');
    participantsListTrue.forEach(participant =>{
        wordData.addColumn('number', participant);
    })

    var wordsAdded = 0;

    for (var word of conversation["Conversation Totals"]["wordsOrdered"]) {
        if (word.length >= wordSearch_minLength && word.length <= wordSearch_maxLength) {

            var newRow = [word];

            for (let j = 0; j < participantsListTrue.length; j++) {
                var count = conversation[participantsListTrue[j]]["words"][word];

                newRow[j+1] = count;
            }

            wordData.addRow(newRow);

            wordsAdded++;
        }
        else{
            continue;
        }

        if (wordsAdded >= wordSearch_displayCount) {
            break;
        }
    }

    wordChart.draw(wordData, wordOptions);
}

var emojiOptions = {title:"Emojis by Frequency",
                width: graphWidth,
                height: graphHeight,
                vAxis:{minValue: 0},
                isStacked: true,
                chartArea: commonChartArea,
                legend: {position: 'bottom', alignment: 'start'},
                titleTextStyle: {
                    fontSize: titleFontSize,
                }
};

function drawEmojiChart() {
    var emojiTable = document.getElementById("emojiTable");

    var headerRow = document.getElementById("headerRow");
    
    emojiData = new google.visualization.DataTable();

    emojiData.addColumn('string', 'Emoji');
    participantsListTrue.forEach(participant =>{
        emojiData.addColumn('number', participant);

        headerRow.insertAdjacentHTML('beforeend', `<th>${participant}</th>`);
    })

    var emojisAdded = 0;

    for (var emoji of conversation["Conversation Totals"]["emojisOrdered"]) {
        var newRow = [emojione.toImage(emoji)];

        for (let j = 0; j < participantsListTrue.length; j++) {
            newRow[j+1] = conversation[participantsListTrue[j]]["emojis"][emoji];
        }

        // Table Construction

        newRow.unshift(emojisAdded);
        newRow[0] = newRow[0]+1;

        var rowHTML = "";

        newRow.forEach(element => {
            try {
                rowHTML += ("<td>" + element.toString() + "</td>");
            } catch (error) {
                console.log("Error found in emoji table creation. Replacing troublesome element with 'N/A'. Error details: \n" + error);
                rowHTML += ("<td>" + "None!" + "</td>");
            }
        });

        emojiTable.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);

        //
        
        newRow.splice(1,1);
        newRow[0] = "Rank " + newRow[0];
        emojiData.addRow(newRow);

        emojisAdded++;

        if (emojisAdded >= wordSearch_displayCount) {
            break;
        }
    }

    // emojiData.setColumnProperties(0, 'role', 'annotation') 

    emojiChart.draw(emojiData, emojiOptions);
}

var messagesSentOptions = {title:"Messages Sent",
                    width: graphWidth*0.5,
                    height: graphHeight*0.5,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawMessagesSentChart() {
    messagesSentData = new google.visualization.DataTable();

    messagesSentData.addColumn('string', 'Person');
    messagesSentData.addColumn('number', 'Messages Sent');

    participantsListTrue.forEach(participant => {
        var partMessagesSent = conversation[participant]["messagesSent"];

        messagesSentData.addRow([participant, partMessagesSent]);
    });

    messageSentChart.draw(messagesSentData, messagesSentOptions);
}

var wordsSentOptions = {title:"Words Sent",
                    width: graphWidth*0.5,
                    height: graphHeight*0.5,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'bottom', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }
};

function drawWordsSentChart() {
    wordsSentData = new google.visualization.DataTable();

    wordsSentData.addColumn('string', 'Person');
    wordsSentData.addColumn('number', 'Words Sent');

    participantsListTrue.forEach(participant => {
        var partWordsSent = sumObjectValues(conversation[participant]["words"]);

        wordsSentData.addRow([participant, partWordsSent]);
    });

    wordsSentChart.draw(wordsSentData, wordsSentOptions);
}

// Changing chart style

function normalStackedCharts() {
    isStackedCheck(dayOptions);
    isStackedCheck(monthOptions);
    isStackedCheck(yearOptions);
    isStackedCheck(timeOptions);
    isStackedCheck(historicalOptions);
    isStackedCheck(wordOptions);
    isStackedCheck(emojiOptions);
    isStackedCheck(msgLengthOptions);

    function isStackedCheck(options) {
        if (options.isStacked != true) {
            options.isStacked = true;
        }
    }

    dayChart.draw(dayData, dayOptions);
    monthChart.draw(monthData, monthOptions);
    yearChart.draw(yearData, yearOptions);
    timeChart.draw(timeData, timeOptions);
    historicalChart.draw(historicalData, historicalOptions);
    wordChart.draw(wordData, wordOptions);
    emojiChart.draw(emojiData, emojiOptions);
    msgLengthChart.draw(msgLengthData, msgLengthOptions);
}

function fullStackedCharts() {
    isStackedCheck(dayOptions);
    isStackedCheck(monthOptions);
    isStackedCheck(yearOptions);
    isStackedCheck(timeOptions);
    isStackedCheck(historicalOptions);
    isStackedCheck(wordOptions);
    isStackedCheck(emojiOptions);
    isStackedCheck(msgLengthOptions);

    function isStackedCheck(options) {
        if (options.isStacked != 'percent') {
            options.isStacked = 'percent';
        }
        else{}
    }

    dayChart.draw(dayData, dayOptions);
    monthChart.draw(monthData, monthOptions);
    yearChart.draw(yearData, yearOptions);
    timeChart.draw(timeData, timeOptions);
    historicalChart.draw(historicalData, historicalOptions);
    wordChart.draw(wordData, wordOptions);
    emojiChart.draw(emojiData, emojiOptions);
    msgLengthChart.draw(msgLengthData, msgLengthOptions);
}

function noStackedCharts() {
    isStackedCheck(dayOptions);
    isStackedCheck(monthOptions);
    isStackedCheck(yearOptions);
    isStackedCheck(timeOptions);
    isStackedCheck(historicalOptions);
    isStackedCheck(wordOptions);
    isStackedCheck(emojiOptions);
    isStackedCheck(msgLengthOptions);

    function isStackedCheck(options) {
        if (options.isStacked != false) {
            options.isStacked = false;
        }
        else{}
    }

    dayChart.draw(dayData, dayOptions);
    monthChart.draw(monthData, monthOptions);
    yearChart.draw(yearData, yearOptions);
    timeChart.draw(timeData, timeOptions);
    historicalChart.draw(historicalData, historicalOptions);
    wordChart.draw(wordData, wordOptions);
    emojiChart.draw(emojiData, emojiOptions);
    msgLengthChart.draw(msgLengthData, msgLengthOptions);
}

// %%%%% Helper functions that do not directly aid analysis or plotting
function objectAddNewValueOrIncrement(ObjectRef, keyValue){
    if (ObjectRef[keyValue]) {
        ObjectRef[keyValue] += 1;
    }
    else{
        ObjectRef[keyValue] = 1;
    }
}

// enables the submit button so the user cannot press it before the page is ready.
function enableSubmitButton() {
    var button = document.getElementById("submitFile");
    button.removeAttribute("disabled");
}

function sumObjectValues( obj ) {
    var sum = 0;
    for( var el in obj ) {
      if( obj.hasOwnProperty( el ) ) {
        sum += parseFloat( obj[el] );
      }
    }
    return sum;
}

function arrayString2Ints(array) {

    var intArray = [];

    array.forEach(element => {
        intArray.push(parseInt(element));
    });

    return intArray;
}

// loads google data table api on callback
function loadDataTables(){
    dayChart = new google.visualization.ColumnChart(document.getElementById("day_chart"));

    monthChart = new google.visualization.ColumnChart(document.getElementById("month_chart"));

    yearChart = new google.visualization.ColumnChart(document.getElementById("year_chart"));

    timeChart = new google.visualization.ColumnChart(document.getElementById("time_chart"));

    historicalChart = new google.visualization.ColumnChart(document.getElementById("historical_chart"));

    msgLengthChart = new google.visualization.ColumnChart(document.getElementById("messageLength_chart"));

    wordChart = new google.visualization.ColumnChart(document.getElementById("word_chart"));

    emojiChart = new google.visualization.ColumnChart(document.getElementById("emoji_chart"));

    messageSentChart = new google.visualization.PieChart(document.getElementById("messageSentInfo_chart"));

    wordsSentChart = new google.visualization.PieChart(document.getElementById("wordsSentInfo_chart"));
}

// update progress status
function updateStatus(){
    docStatus.innerText = "If you like, change some options then click Start to begin the analysis! Might take a few seconds for larger files.";
    docStatus.classList.remove("alert-danger");
    docStatus.classList.add("alert-warning");
}

function changeFileSelectLabel() {
    document.getElementById("fileSelectLabel").innerText = selectedFile.files[0].name;
    document.getElementById("fileSelectLabel").classList.add("text-success");
}

function toggleFbTutorial(){
    var element = document.getElementById("downloadTutorial");

    element.style.display = element.style.display === "none" ? "" : "none";
}

function formatDate(date) {
    var d = date,
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}