// =====================================================
// RETRO NFC
// BOOT SYSTEM
// =====================================================

const BOOT_DELAY = 700;

const bootSequence = [
    "████████████████████████████",
    "RETRO NFC",
    "████████████████████████████",
    "",
    "POWER ON",
    "CHECKING CPU ............ OK",
    "CHECKING MEMORY ......... OK",
    "CHECKING VIDEO .......... OK",
    "CHECKING AUDIO .......... OK",
    "SEARCHING NFC TAG ..."
];

async function startBoot(){

    resetBoot();

    for(let i=0;i<bootSequence.length;i++){

        await printBootText(bootSequence[i]);

        updateProgress(i+1,bootSequence.length+3);

    }

    await sleep(600);

    await cartridgeDetected();

}

function resetBoot(){

    document.getElementById("boot1").innerHTML="";
    document.getElementById("boot2").innerHTML="";
    document.getElementById("boot3").innerHTML="";
    document.getElementById("boot4").innerHTML="";
    document.getElementById("boot5").innerHTML="";
    document.getElementById("boot6").innerHTML="";

    currentLine=1;

    document.getElementById("progressFill").style.width="0%";

    document.getElementById("progressText").innerHTML="0%";

}

let currentLine=1;

async function printBootText(text){

    const line=document.getElementById("boot"+currentLine);

    if(!line){

        await scrollBoot(text);

        return;

    }

    await typeWriter(line,text);

    currentLine++;

    await sleep(BOOT_DELAY);

}

async function typeWriter(element,text){

    element.innerHTML="";

    for(let i=0;i<text.length;i++){

        element.innerHTML+=text.charAt(i);

        await sleep(22);

    }

}

async function scrollBoot(text){

    const terminal=document.querySelector(".bootTerminal");

    const div=document.createElement("div");

    div.className="bootLine";

    terminal.appendChild(div);

    await typeWriter(div,text);

    terminal.scrollTop=terminal.scrollHeight;

    await sleep(BOOT_DELAY);

}

function updateProgress(step,total){

    const percent=Math.round(step*100/total);

    document.getElementById("progressFill").style.width=percent+"%";

    document.getElementById("progressText").innerHTML=percent+"%";

}

function sleep(ms){

    return new Promise(resolve=>setTimeout(resolve,ms));

}

// =====================================================
// BOOT PART 2
// =====================================================

async function cartridgeDetected(){

    if(navigator.vibrate){

        navigator.vibrate(180);

    }

    await printBootText("CARTRIDGE DETECTED");

    updateProgress(bootSequence.length+1,bootSequence.length+3);

    await sleep(600);

    await printBootText(CURRENT_GAME.title.toUpperCase());

    updateProgress(bootSequence.length+2,bootSequence.length+3);

    if(CURRENT_GAME.subtitle){

        await printBootText(CURRENT_GAME.subtitle.toUpperCase());

    }

    updateProgress(bootSequence.length+3,bootSequence.length+3);

    await sleep(1200);

    transitionToGame();

}

async function transitionToGame(){

    const boot=document.getElementById("bootScreen");

    boot.style.transition="opacity .8s ease";

    boot.style.opacity="0";

    await sleep(800);

    boot.style.display="none";

    showGameAnimation();

}

async function showGameAnimation(){

    const game=document.getElementById("gameScreen");

    game.style.display="flex";

    game.style.opacity="0";

    fillGame();

    const cover=document.querySelector(".coverArea");

    const info=document.querySelector(".infoArea");

    const button=document.getElementById("startButton");

    cover.style.opacity="0";
    cover.style.transform="translateY(120px) scale(.85)";

    info.style.opacity="0";
    info.style.transform="translateY(40px)";

    button.style.opacity="0";
    button.style.transform="translateY(20px)";

    await sleep(150);

    game.style.transition="opacity .8s ease";

    game.style.opacity="1";

    await sleep(250);

    cover.style.transition="all .8s cubic-bezier(.2,.9,.2,1)";
    cover.style.opacity="1";
    cover.style.transform="translateY(0) scale(1)";

    await sleep(350);

    info.style.transition="all .7s ease";
    info.style.opacity="1";
    info.style.transform="translateY(0)";

    await sleep(350);

    button.style.transition="all .5s ease";
    button.style.opacity="1";
    button.style.transform="translateY(0)";

    button.animate([
        {transform:"scale(.96)"},
        {transform:"scale(1.05)"},
        {transform:"scale(1)"}
    ],{
        duration:450,
        easing:"ease-out"
    });

}

// =====================================================
// BOOT PART 3
// FINAL
// =====================================================

let cursorVisible = true;
let cursorTimer = null;

function startCursor(){

    stopCursor();

    cursorTimer = setInterval(()=>{

        const cursor = document.getElementById("bootCursor");

        if(!cursor) return;

        cursorVisible = !cursorVisible;

        cursor.style.opacity = cursorVisible ? "1" : "0";

    },450);

}

function stopCursor(){

    if(cursorTimer){

        clearInterval(cursorTimer);

        cursorTimer = null;

    }

}

async function typeWriter(element,text){

    element.innerHTML="";

    for(let i=0;i<text.length;i++){

        element.innerHTML += text.charAt(i);

        await sleep(18);

    }

}

async function bootSound(){

    try{

        const ctx = new(window.AudioContext||window.webkitAudioContext)();

        const osc = ctx.createOscillator();

        const gain = ctx.createGain();

        osc.type = "square";

        osc.frequency.value = 420;

        gain.gain.value = .015;

        osc.connect(gain);

        gain.connect(ctx.destination);

        osc.start();

        osc.stop(ctx.currentTime+.07);

    }

    catch(e){}

}

async function bootBeep(){

    try{

        await bootSound();

    }

    catch(e){}

}

async function finalFlash(){

    const boot = document.getElementById("bootScreen");

    boot.animate(

        [

            {filter:"brightness(1)"},

            {filter:"brightness(1.4)"},

            {filter:"brightness(.95)"},

            {filter:"brightness(1)"}

        ],

        {

            duration:500,

            easing:"ease"

        }

    );

}

async function finishBoot(){

    stopCursor();

    await finalFlash();

    await sleep(250);

    transitionToGame();

}

window.addEventListener("load",()=>{

    startCursor();

});
