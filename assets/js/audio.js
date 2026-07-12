function beep(freq=700,duration=50){

    const ctx=new(window.AudioContext||window.webkitAudioContext)();

    const osc=ctx.createOscillator();

    const gain=ctx.createGain();

    osc.frequency.value=freq;

    osc.type="square";

    osc.connect(gain);

    gain.connect(ctx.destination);

    gain.gain.value=.03;

    osc.start();

    setTimeout(()=>{

        osc.stop();

        ctx.close();

    },duration);

}
