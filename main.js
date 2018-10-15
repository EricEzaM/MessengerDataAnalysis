console.log("Last Updated 15-10-18 11:50pm")

// load google charts API
google.charts.load('current', {'packages':['corechart']});
google.charts.load('current', {packages: ['table']});
google.charts.setOnLoadCallback(enableSubmitButton);
google.charts.setOnLoadCallback(loadGoogleCharts);

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

var resetEmojiTable = document.getElementById("emojiTable").innerHTML;
var resetWordInfoTable = document.getElementById("participantWordInfoTable").innerHTML;
var resetMessageTypeTable = document.getElementById("messageTypeTable").innerHTML;

// When the submit button is pressed, this starts the whole analysis process.
submitButton.addEventListener("click", function(){
    t0 = performance.now()

    conversation = {};
    participantsList = [];
    participantsListTrue = [];
    testTextOutput.innerHTML = "";
    loadGoogleCharts();

    wordSearch_minLength = parseInt(document.getElementById("wordsMin").value);
    wordSearch_maxLength = parseInt(document.getElementById("wordsMax").value);

    messageTimeDisplay = document.getElementById("messagesByDay").options[document.getElementById("messagesByDay").selectedIndex].value;
    history_ChartDisplay = document.getElementById("messagesHistory").options[document.getElementById("messagesHistory").selectedIndex].value;

    document.getElementById("emojiTable").innerHTML = resetEmojiTable;

    document.getElementById("participantWordInfoTable").innerHTML = resetWordInfoTable;

    document.getElementById("messageTypeTable").innerHTML = resetMessageTypeTable;

    // new file reader
    var fr = new FileReader();

    fr.onload = function(){
        JSONstring = JSON.parse(this.result);

        analyseAndPlot(JSONstring);
    }
    fr.readAsText(selectedFile.files[0]);
});

function analyseAndPlot(json){
    t1 = performance.now()

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
        if (thisMessageContentType == "Text Messages") {
            // Get words sent, emojis sent and the message length
            var wordsListEmojiListMessageCount = messageContentAnalysis(decodeURIComponent(escape(message.content)));
            
            // add words to structs
            wordsListEmojiListMessageCount.messageWordsFiltered.forEach(word => {
                objectAddNewValueOrIncrement(conversation[message.sender_name]["words"], word);
                objectAddNewValueOrIncrement(conversation["Conversation Totals"]["words"], word);
            })

            // add emojis to structs
            wordsListEmojiListMessageCount.messageEmojisSent.forEach(emoji => {
                objectAddNewValueOrIncrement(conversation[message.sender_name]["emojis"], emoji);
                objectAddNewValueOrIncrement(conversation["Conversation Totals"]["emojis"], emoji);
            })

            // add message length to structs
            objectAddNewValueOrIncrement(conversation[message.sender_name]["messageLength"], wordsListEmojiListMessageCount.messageLength);
            objectAddNewValueOrIncrement(conversation["Conversation Totals"]["messageLength"], wordsListEmojiListMessageCount.messageLength);
        }
    });

    // sort the words and emojis used by each participant by frequency
    participantsList.forEach(participant => {
        conversation[participant]["wordsOrdered"] = sortMessageContentByFrequency(conversation[participant]["words"]);
        conversation[participant]["emojisOrdered"] = sortMessageContentByFrequency(conversation[participant]["emojis"]);
    });

    analysisCompleteDOMChanges();

    setAllGraphOptions();

    writeConversationInfo();

    createMessageTypesInfoTable();
    createParticipantWordInfoTable();

    drawDayChart();
    drawMonthChart();
    drawYearChart();
    drawTimeChart();
    drawHistoricalChart();
    drawWordChart();
    drawEmojiChart();
    drawMsgLengthChart();
    drawMessagesSentPie();
    drawWordsSentPie();

    document.getElementById("analysisStartDiv").scrollIntoView(true);

    var t3 = performance.now()
    console.log(`Done! Total Time: ${((t3-t0)/1000).toFixed(2)} seconds`)

    console.log("Raw Conversation Data:")
    console.log(conversation);
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
    else{
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

    var posRegex = new RegExp("[\\w‘’“”'" + LatiniseString + "]", "g");
    var negRegex = new RegExp("[^\\w‘’“”'" + LatiniseString + "]", "g");

    // Match anthing that DOES CONTAIN an alphanumeric character or apostrophe. 
    var messageWordsUnfiltered = messageContent.filter(n => n.match(posRegex));
    // this unfiltered list will still contain words that have emojis at the start/end with no space in between. Remove the emojis so just the word is left.
    var messageWordsFiltered = [];
    messageWordsUnfiltered.forEach(word => {
        var word1 = word.replace(negRegex,'');
        messageWordsFiltered.push(word.replace(negRegex,''));
    })
    // remove empty entries, if there are any. 
    messageWordsFiltered = messageWordsFiltered.filter(function(e){return e});

    // ~~~~~ EMOJIS ~~~~~

    // match anything that contains something that IS NOT an alphanumeric charater or apostophe
    var messageAllEmojis = messageContent.filter(n => n.match(negRegex));
    // array used to store INDIVIDUAL emojis sent. Eg 3 hearts in a row become 3 induvidual hearts
    var messageEmojisSent = [];
    // use emoji splitter tool to split by emojis. 
    var splitter = new GraphemeSplitter();
    messageAllEmojis.forEach(word => {
        // split emojis and other characters
        var splitwords = splitter.splitGraphemes(word);
        // remove other characters, only leaving emojis
        splitWordsAndEmojis = splitwords.filter(n => n.match(negRegex));
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

// %%%% Time Related Charts

function setAllGraphOptions() {

    graphWidth = document.getElementById("AnalysisOptions").offsetWidth*0.75;
    graphHeight = document.getElementById("AnalysisOptions").offsetWidth*0.5;
    titleFontSize = 18;

    if (participantsListTrue.length < 4) {
        commonChartArea = {width: '100%', height: '80%', left:'0%'};
        commonChartLegend = {position: 'bottom', alignment: 'start'};
    }
    else{
        commonChartArea = {width: '80%', height: '80%', left:'0%'};
        commonChartLegend = {position: 'right', alignment: 'start'};
    }

    dayOptions =   {title:"Messages by Day of the week",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    monthOptions =   {title:"Messages by Month of the Year",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    yearOptions =   {title:"Messages by Year",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    timeOptions =   {title:"Messages by Time of Day",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    hAxis: {
                        format: 'HH:mm',
                    },
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    historicalOptions =   {title:"Messages by All Time",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    hAxis: {
                        format: 'MM/yy',
                    },
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
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
                    }}};

    msgLengthOptions = {title:"Messages by length (words)",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    },
                    hAxis:{
                        viewWindow:{
                            min: 0,
                            max: 100 
                        }}};

    wordOptions = {title:"Words by Frequency",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    emojiOptions = {title:"Emojis by Frequency",
                    width: graphWidth,
                    height: graphHeight,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: commonChartLegend,
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    messagesSentOptions = {title:"Messages Sent",
                    width: graphWidth*0.5,
                    height: graphHeight*0.5,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: '', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};

    wordsSentOptions = {title:"Words Sent",
                    width: graphWidth*0.5,
                    height: graphHeight*0.5,
                    vAxis:{minValue: 0},
                    isStacked: true,
                    chartArea: commonChartArea,
                    legend: {position: 'right', alignment: 'start'},
                    titleTextStyle: {
                        fontSize: titleFontSize,
                    }};


    
}

function drawDayChart() {
    dayData = setTimeData("day");

    dayChart.draw(dayData, dayOptions);
}

function drawMonthChart() {
    monthData = setTimeData("month");

    monthChart.draw(monthData, monthOptions);
}

function drawYearChart() {
    yearData = setTimeData("year");

    yearChart.draw(yearData, yearOptions);
}

function drawTimeChart() {
    timeData = setTimeData("time");

    timeChart.draw(timeData, timeOptions);
}

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

// %%%%% Content Related Charts

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

// Word Chart

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

    wordOptions.title = `Words by Frequency, limited to ${wordSearch_minLength} to ${wordSearch_maxLength} letters long`

    wordChart.draw(wordData, wordOptions);
}

// Emoji Chart

function drawEmojiChart() {
    var emojiTableHead = document.getElementById("emojiTableHead");

    var emojiTableBody = document.getElementById("emojiTableBody");
    
    emojiData = new google.visualization.DataTable();

    emojiData.addColumn('string', 'Emoji');
    participantsListTrue.forEach(participant =>{
        emojiData.addColumn('number', participant);

        emojiTableHead.innerHTML += `<th class="px-2">${participant}</th>`
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
                rowHTML += ("<td> None! </td>");
            }
        });

        emojiTableBody.innerHTML += `<tr>${rowHTML}</tr>`;

        //
        
        newRow.splice(1,1);
        newRow[0] = "" + newRow[0];
        emojiData.addRow(newRow);

        emojisAdded++;

        if (emojisAdded >= wordSearch_displayCount) {
            break;
        }
    }

    // emojiData.setColumnProperties(0, 'role', 'annotation') 

    emojiChart.draw(emojiData, emojiOptions);
}

// Pie Charts at top of page

function drawMessagesSentPie() {
    messagesSentData = new google.visualization.DataTable();

    messagesSentData.addColumn('string', 'Person');
    messagesSentData.addColumn('number', 'Messages Sent');

    participantsListTrue.forEach(participant => {
        var partMessagesSent = conversation[participant]["messagesSent"];

        messagesSentData.addRow([participant, partMessagesSent]);
    });

    messageSentChart.draw(messagesSentData, messagesSentOptions);
}

function drawWordsSentPie() {
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

// Creating Tables

function createMessageTypesInfoTable(){
    participantsListTrue.forEach(participant => {

        var messageTypesInfoTable = document.getElementById("messageTypesInfoTable");

        var textMsg = (conversation[participant]["messageContentType"]["Text Messages"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Text Messages"];
        var photos = (conversation[participant]["messageContentType"]["Photos"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Photos"];
        var videos = (conversation[participant]["messageContentType"]["Videos"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Videos"];
        var stickers = (conversation[participant]["messageContentType"]["Stickers"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Stickers"];
        var gifs = (conversation[participant]["messageContentType"]["GIFs"] === undefined) ? 0 : conversation[participant]["messageContentType"]["GIFs"];
        var files = (conversation[participant]["messageContentType"]["Files"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Files"];
        var shared = (conversation[participant]["messageContentType"]["Shared Links"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Shared Links"];
        var audio = (conversation[participant]["messageContentType"]["Audio Files"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Audio Files"]
        var plans = (conversation[participant]["messageContentType"]["Plan (linked date/time)"] === undefined) ? 0 : conversation[participant]["messageContentType"]["Plan (linked date/time)"]

        var rowHTML = (`<td>${participant}</td><td>${textMsg}</td><td>${photos}</td><td>${videos}</td><td>${stickers}</td><td>${gifs}</td><td>${files}</td><td>${shared}</td><td>${audio}</td><td>${plans}</td>`);

        messageTypesInfoTable.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);
    });
}

function createParticipantWordInfoTable(){
    participantsListTrue.forEach(participant => {

        var participantWordInfoBody = document.getElementById("participantWordInfoBody");

        var partMessagesSent = conversation[participant]["messagesSent"];
        var partWordsSent = sumObjectValues(conversation[participant]["words"]);

        var rowHTML = (`<td>${participant}</td><td>${partMessagesSent}</td><td>${partWordsSent}</td><td>${(partWordsSent/partMessagesSent).toFixed(2)}</td>`);

        participantWordInfoBody.insertAdjacentHTML('beforeend', `<tr>${rowHTML}</tr>`);
    });
}

// Pie Charts

// Generic Info

function writeConversationInfo() {
    document.getElementById("info").innerHTML = 
    `<strong>Total Messages </strong>: ${conversation["Conversation Totals"]["messagesSent"]} <br> 
    <strong>Total Words </strong>: ${sumObjectValues(conversation["Conversation Totals"]["words"])} <br> 
    <strong>Unique Words </strong>: ${Object.keys(conversation["Conversation Totals"]["words"]).length} <br>
    <strong>Total Emojis </strong>: ${sumObjectValues(conversation["Conversation Totals"]["emojis"])} <br> 
    <strong>Unique Emojis </strong>: ${Object.keys(conversation["Conversation Totals"]["emojis"]).length} <br>`;

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
function loadGoogleCharts(){
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
    docStatus.innerText = "If you like, change some options then click Start to begin the analysis! Larger files (100k+ messages) may take 10-20 seconds to finish (depends on your computers speed)";
    docStatus.classList.remove("alert-danger");
    docStatus.classList.add("alert-warning");
}

function printPlots() {
    var printContents = document.getElementById("conversationInformation").innerHTML;
    var originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents.replace("style=\"display: inline-block;\"", '');
    document.body.classList.add("text-center")
    window.print();
    document.body.innerHTML = originalContents;
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

function analysisCompleteDOMChanges() {
    docStatus.innerHTML = "Analysis Complete! If you like, change some settings and press start again or select a new file. <br><sub>For the raw data, see browser console logs.</sub>";
    docStatus.classList.remove("alert-warning");
    docStatus.classList.add("alert-success");
    document.getElementById("waitMessage").setAttribute("hidden", true);
    document.getElementById("conversationInformation").removeAttribute("hidden");
    document.getElementById("chartToggles").removeAttribute("hidden");
}

// var latin_map = {"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x","×":"x", "○":"o", "³":"3"};

var latin_map = {"à":"a", "è":"e", "ì":"i", "ò":"o", "ù":"u", "À":"A", "È":"E", "Ì":"I", "Ò":"O", "Ù":"U", "á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u", "ý":"y", "Á":"A", "É":"E", "Í":"I", "Ó":"O", "Ú":"U", "Ý":"Y", "â":"a", "ê":"e", "î":"i", "ô":"o", "û":"u", "ð":"o", "Â":"A", "Ê":"E", "Î":"I", "Ô":"O", "Û":"U", "Ð":"D", "ã":"a", "ñ":"n", "õ":"o", "Ã":"A", "Ñ":"N", "Õ":"O", "ä":"a", "ë":"e", "ï":"i", "ö":"o", "ü":"u", "ÿ":"y", "Ä":"A", "Ë":"E", "Ï":"I", "Ö":"O", "Ü":"U", "Ÿ":"Y", "å":"a", "Å":"A", "æ":"ae", "œ":"oe", "Æ":"AE", "Œ":"OE", "ß":"B", "ç":"c", "Ç":"C", "ø":"o", "Ø":"O", "¿":"?" , "¡":"!"};

var LatiniseString = Object.keys(latin_map).join('');