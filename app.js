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

async function startKanjiQuiz(newWords = "") {
    newWordsOnly = newWords;

    canDraw = true;

    document.getElementById("correctButton").disabled = true;
    document.getElementById("wrongButton").disabled = true;
    document.getElementById("finishButtonK").disabled = false;

    const response = await fetch("./data/kanji.json");
    quizList = await response.json();

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

        return;
    }

    setupCanvas();
    nextKanjiChar();
}



let quizMode = ""
let displayWord = ""
let answerWord = ""

async function startVocabQuiz(mode, newWords = "") {
    newWordsOnly = newWords;

    quizMode = mode;

    document.getElementById("answerBar").disabled = false;
    document.getElementById("finishButtonV").disabled = false;

    const response = await fetch("./data/vocab_${quizMode}.json");
    quizList = await response.json();

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
