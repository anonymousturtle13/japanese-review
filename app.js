const fs = require("fs");
const path = require("path");

let dailyStatus = [];

window.onload = function () {

    // get today's review status
    filePath = path.join(__dirname, "data/status.json");
    const fileData = fs.readFileSync(filePath, "utf8");
    dailyStatus = JSON.parse(fileData);

    // reset review progress if next day
    today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Chicago"});

    if (today != dailyStatus.date) {
        dailyStatus.date = today;
        dailyStatus.kanji_done = false;
        dailyStatus.jpen_done = false;
        dailyStatus.enjp_done = false;
    }
    
    // update checkboxes
    updateCheckSquares([dailyStatus.kanji_done, dailyStatus.jpen_done, dailyStatus.enjp_done]);
}

function updateCheckSquares(checks) {

    squares = document.querySelectorAll("#checkSquares .check-square");

    squares.forEach((square, index) => {
        square.classList.toggle("checked", checks[index]);
    });

    fs.writeFileSync("data/status.json", JSON.stringify(dailyStatus, null, 2));
}

function updateDisplay(displayID) {

    const containers = document.querySelectorAll(".container");

    containers.forEach(container => {
        if (container.id === displayID) {
            container.style.display = "flex";
        } else {
            container.style.display = "none";
        }
    });
}



let quizCurrent;
let quizList = []
let quizQueue = []
let quizLength;
let quizCnt;
let newWordsOnly = ""

let intervals = [0, 1, 1, 2, 3, 5, 8, 13, 21];

function createQuizQueue()
{
    if (newWordsOnly == "new") {
        quizList.forEach((item) => {
            if (item.stage == 0) {
                today = new Date();
                today = today.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
    
                if (today == item.first_seen) {
                    quizQueue.push(item);
                } 
            } 
        });
    } else if (newWordsOnly == "all") {
        quizList.forEach((item) => {
            quizQueue.push(item);
        });
    } else {
        quizList.forEach((item) => {
            if (item.stage == 0) {
                today = new Date();
                start = new Date(item.first_seen);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
    
                today = today.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
                start = start.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
                end = end.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
    
                if (today >= start && today <= end) {
                    quizQueue.push(item);
                } else {
                    item.stage = 1;
                    quizQueue.push(item);
                }
            } else {
                today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
                if (today >= item.next_seen) {
                    quizQueue.push(item);
                }
            }
        });
    }

    shuffle(quizQueue);
    quizLength = quizQueue.length;
    quizCnt = 0;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}



let canvas;
let ctx;
let canDraw = true;
let drawing = false;

function startKanjiQuiz(newWords = "") {
    newWordsOnly = newWords;

    canDraw = true;

    document.getElementById("correctButton").disabled = true;
    document.getElementById("wrongButton").disabled = true;
    document.getElementById("finishButtonK").disabled = true;

    filePath = path.join(__dirname, "data/kanji.json");
    const fileData = fs.readFileSync(filePath, "utf8");
    quizList = JSON.parse(fileData);

    createQuizQueue();
    nextKanjiChar();
}

function nextKanjiChar() {
    
    setupCanvas();

    quizCurrent = quizQueue.shift();

    document.getElementById("writingPrompt").innerText = quizCurrent.romaji;
    document.getElementById("correctCharacter").innerText = quizCurrent.char;
    document.getElementById("correctCharacter").style.visibility = "hidden";

    document.getElementById("correctButton").disabled = true;
    document.getElementById("wrongButton").disabled = true;

    quizCnt = quizCnt + 1;
    document.getElementById("kanjiProgress").innerText = `${quizCnt} / ${quizLength}`;
}

function setupCanvas() {

    canvas = document.getElementById("drawCanvas");
    ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);

    canvas.onmousedown = (event) => {

        drawing = true;

        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.onmouseup = () => {
        drawing = false;
        ctx.beginPath();
    };

    canvas.onmouseleave = () => {
        drawing = false;
        ctx.beginPath();
    };

    canvas.onmousemove = draw;
}

function draw(event) {

    if (!drawing) return;

    let rect = canvas.getBoundingClientRect();

    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;


    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
}

document.addEventListener("keydown", function(event){

    if(event.key !== "Enter") return;

    document.getElementById("correctCharacter").style.visibility = "visible";
    document.getElementById("correctButton").disabled = false;
    document.getElementById("wrongButton").disabled = false;
});

function checkWritingAnswer(result) {

    if (quizCurrent.stage > 0) {
        if (result == "wrong") {
            quizCurrent.stage = 0;
            let last = new Date();
            last.setDate(last.getDate() - 4);
            quizCurrent.first_seen = last.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
        } else {
            quizCurrent.stage = Math.min(8, quizCurrent.stage + 1);
        }

        let next = new Date();
        next.setDate(next.getDate() + intervals[quizCurrent.stage]);
        quizCurrent.next_seen = next.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
    }

    if (result == "wrong") {
        quizLength = quizLength + 1;
        quizQueue.unshift(quizCurrent);
        quizQueue.push(quizCurrent);
    } 

    if (quizQueue.length == 0) {

        document.getElementById("writingPrompt").innerText ="done!";

        canDraw = false;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        document.getElementById("correctCharacter").style.visibility = "hidden";

        document.getElementById("correctButton").disabled = true;
        document.getElementById("wrongButton").disabled = true;

        document.getElementById("finishButtonK").disabled = false;
    
        if (newWordsOnly != "all") {
            fs.writeFileSync(
                `data/kanji.json`,
                JSON.stringify(quizList, null, 2)
            );    
        }

        dailyStatus.kanji_done = true;
        updateCheckSquares([dailyStatus.kanji_done, dailyStatus.jpen_done, dailyStatus.enjp_done]);

        return;
    }

    setupCanvas();
    nextKanjiChar();
}



let quizMode = ""
let displayWord = ""
let answerWord = ""

function startVocabQuiz(mode, newWords = "") {
    newWordsOnly = newWords;

    quizMode = mode;

    document.getElementById("answerBar").disabled = false;
    document.getElementById("finishButtonV").disabled = true;

    filePath = path.join(__dirname, `data/vocab_${quizMode}.json`);
    const fileData = fs.readFileSync(filePath, "utf8");
    quizList = JSON.parse(fileData);

    createQuizQueue();
    nextVocabWord();
}

function nextVocabWord() {

    if (quizQueue.length === 0) {

        if (newWordsOnly != "all") {
            fs.writeFileSync(
                `data/vocab_${quizMode}.json`,
                JSON.stringify(quizList, null, 2)
            );
        }

        document.getElementById("quizWord").textContent ="done!";
        document.getElementById("answerBar").value = "";
        document.getElementById("answerBar").disabled = true;
        document.getElementById("finishButtonV").disabled = false;

        if (quizMode == "jap") {dailyStatus.jpen_done = true;}
        if (quizMode == "eng") {dailyStatus.enjp_done = true;}

        updateCheckSquares([dailyStatus.kanji_done, dailyStatus.jpen_done, dailyStatus.enjp_done]);

        return;
    }

    quizCurrent = quizQueue.shift();

    if (quizMode == "jap") {
        displayWord = quizCurrent.jap;
        answerWord = quizCurrent.eng;
    } else if (quizMode == "eng") {
        displayWord = quizCurrent.eng;
        answerWord = quizCurrent.jap;
    }

    document.getElementById("quizWord").textContent = displayWord;
    document.getElementById("answerBar").value = "";
    document.getElementById("answerBar").focus();

    quizCnt = quizCnt + 1;
    document.getElementById("vocabProgress").innerText = `${quizCnt} / ${quizLength}`;
}

document.getElementById("answerBar").addEventListener("keydown", function(e) {

    if (e.key !== "ArrowRight") return;

    const guess = this.value.trim().toLowerCase();

    if (guess === answerWord) { 
        if (quizCurrent.stage > 0) {
            quizCurrent.stage = Math.min(8, quizCurrent.stage + 1);
            let next = new Date();
            next.setDate(next.getDate() + intervals[quizCurrent.stage]);
            quizCurrent.next_seen = next.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
        }
    } else {
        
        if (quizCurrent.stage > 0) {
            quizCurrent.stage = 0;
            let last = new Date();
            last.setDate(last.getDate() - 4);
            quizCurrent.first_seen = last.toLocaleDateString("en-CA", {timeZone: "America/Chicago"});
        } 

        quizLength = quizLength + 1;
        quizQueue.unshift(quizCurrent);
        quizQueue.push(quizCurrent);
    }

    nextVocabWord();
});






let kanjiList = [];

function startAddingKanji() {

    filePath = path.join(__dirname, "data/kanji.json");
    const fileData = fs.readFileSync(filePath, "utf8");
    kanjiList = JSON.parse(fileData);

    document.getElementById("addKanjiScreen").style.display = "flex";

    document.getElementById("kanjiCharInput").value = "";
    document.getElementById("kanjiMeaningInput").value = "";
}

function addKanji() {

    const char = document.getElementById("kanjiCharInput").value.trim();
    const meaning = document.getElementById("kanjiMeaningInput").value.trim();

    if (!char || !meaning) {
        return;
    }

    const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Chicago"});

    kanjiList.push({
        char: char,
        meaning: meaning,
        first_seen: today,
        stage: 0,
        next_seen: ""
    });

    document.getElementById("kanjiCharInput").value = "";
    document.getElementById("kanjiMeaningInput").value = "";
}

function finishAddingKanji() {

    addKanji();
    console.log(kanjiList);

    fs.writeFileSync(
        `data/kanji.json`,
        JSON.stringify(kanjiList, null, 2)
    );

    document.getElementById("addKanjiScreen").style.display = "none";
}






let vocabList = [];

function startAddingVocab() {

    filePath = path.join(__dirname, "data/vocab_eng.json");
    const fileData = fs.readFileSync(filePath, "utf8");
    vocabList = JSON.parse(fileData);

    document.getElementById("addVocabScreen").style.display = "flex";

    document.getElementById("vocabJapInput").value = "";
    document.getElementById("vocabEngInput").value = "";
}

function addVocab() {

    const japWord = document.getElementById("vocabJapInput").value.trim();
    const engWord = document.getElementById("vocabEngInput").value.trim();

    if (!japWord || !engWord) {
        return;
    }

    const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Chicago"});

    vocabList.push({
        jap: japWord,
        eng: engWord,
        first_seen: today,
        stage: 0,
        next_seen: ""
    });

    document.getElementById("vocabJapInput").value = "";
    document.getElementById("vocabEngInput").value = "";
}

function finishAddingVocab() {

    addVocab();

    fs.writeFileSync(
        `data/vocab_jap.json`,
        JSON.stringify(vocabList, null, 2)
    );

    fs.writeFileSync(
        `data/vocab_eng.json`,
        JSON.stringify(vocabList, null, 2)
    );

    document.getElementById("addVocabScreen").style.display = "none";
}