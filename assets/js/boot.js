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

    if(text==="CARTUCHO DETECTADO"){

    line.style.color="#FFD93D";

    line.style.fontWeight="700";

    line.style.textShadow="0 0 18px #FFD93D";

}

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

        text.textContent=BOOT_BLOCKS[
            Math.min(step,BOOT_BLOCKS.length-1)
        ];

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

    if(navigator.vibrate){

        navigator.vibrate([80,60,120]);

    }

    await sleep(350);

}

        if(text==="CARTUCHO DETECTADO"){

    await sleep(600);

}else{

    await sleep(140);

}

    }

    await sleep(500);

    startTransition();

}

// =====================================================
// TRANSIÇÃO FINAL
// =====================================================

async function startTransition(){

    const boot=document.getElementById("bootScreen");

    const game=document.getElementById("gameScreen");

    // Flash branco
    const flash=document.createElement("div");

    flash.style.position="fixed";
    flash.style.left="0";
    flash.style.top="0";
    flash.style.width="100vw";
    flash.style.height="100vh";
    flash.style.background="#FFFFFF";
    flash.style.opacity="0";
    flash.style.pointerEvents="none";
    flash.style.zIndex="9999";
    flash.style.transition="opacity .12s";

    document.body.appendChild(flash);

    await sleep(50);

    flash.style.opacity="1";

    await sleep(120);

    flash.style.opacity="0";

    await sleep(180);

    flash.remove();

    // Esconde boot
    boot.style.transition="opacity .35s";

    boot.style.opacity="0";

    await sleep(350);

    boot.style.display="none";

    // Mostra tela do jogo
    game.style.display="flex";

    game.style.opacity="0";

    fillGame();

    await sleep(30);

    // Anima capa
    const cover=document.querySelector(".coverArea");

    if(cover){

        cover.style.opacity="0";

        cover.style.transform="translateY(40px)";

        cover.style.transition="all .45s ease";

    }

    // Anima botão
    const button=document.getElementById("startButton");

    if(button){

        button.style.opacity="0";

        button.style.transform="translateY(20px)";

        button.style.transition="all .45s ease";

    }

    game.style.transition="opacity .45s";

    game.style.opacity="1";

    await sleep(120);

    if(cover){

        cover.style.opacity="1";

        cover.style.transform="translateY(0)";

    }

    await sleep(220);

    if(button){

        button.style.opacity="1";

        button.style.transform="translateY(0)";

    }

}
