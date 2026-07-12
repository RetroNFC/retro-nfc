// =====================================================
// BOOT
// =====================================================

async function startBoot(){

    const lines = CURRENT_GAME.bootText;

    const progress = document.getElementById("progressFill");

    for(let i=0;i<lines.length;i++){

        document.getElementById("boot"+(i+1)).textContent=lines[i];

        progress.style.width=((i+1)/lines.length)*100+"%";

        await sleep(550);

    }

    await sleep(900);

    openGame();

}

function sleep(ms){

    return new Promise(resolve=>setTimeout(resolve,ms));

}
