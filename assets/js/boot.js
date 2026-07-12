// =====================================================
// RETRO NFC
// BOOT V2
// =====================================================

const BOOT_SPEED = 120;

const BOOT_BLOCKS = [
    "□□□□□□□□□□",
    "■□□□□□□□□□",
    "■■□□□□□□□□",
    "■■■□□□□□□□",
    "■■■■□□□□□□",
    "■■■■■□□□□□",
    "■■■■■■□□□□",
    "■■■■■■■□□□",
    "■■■■■■■■□□",
    "■■■■■■■■■□",
    "■■■■■■■■■■"
];

function sleep(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

function createLine(text){

    const terminal=document.getElementById("bootTerminal");

    const line=document.createElement("div");

    line.className="bootLine";

    line.textContent=text;

    line.style.opacity="0";

    line.style.transform="translateY(8px)";

    terminal.appendChild(line);

    requestAnimationFrame(()=>{

        line.style.transition="all .25s";

        line.style.opacity="1";

        line.style.transform="translateY(0)";

    });

}

function updateProgress(step){

    const fill=document.querySelector(".progressFill");

    const text=document.getElementById("progressText");

    const percent=(step/(BOOT_BLOCKS.length-1))*100;

    if(fill){

        fill.style.width=percent+"%";

    }

    if(text){

        text.textContent=BOOT_BLOCKS[step];

    }

}

function vibrate(){

    if(navigator.vibrate){

        navigator.vibrate(120);

    }

}

// =====================================================
// SEQUÊNCIA DO BOOT
// =====================================================

async function startBoot(){

    const terminal=document.getElementById("bootTerminal");

    terminal.innerHTML="";

    updateProgress(0);

    const lines=CURRENT_GAME.bootText;

    let progress=0;

    for(const text of lines){

        createLine(text);

        if(progress<BOOT_BLOCKS.length-1){

            progress++;

            updateProgress(progress);

        }

        if(text==="CARTUCHO DETECTADO"){

            vibrate();

            await sleep(180);

        }

        await sleep(BOOT_SPEED);

    }

    await sleep(500);

    startTransition();

}

