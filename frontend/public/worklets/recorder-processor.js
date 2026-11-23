class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(4096);
    this.filled = 0;
    this.port.onmessage = (event) => {
      if (event.data === "flush") {
        if (this.filled > 0) this.port.postMessage(this.batch.slice(0, this.filled));
        this.filled = 0;
        this.port.postMessage("flushed");
      }
    };
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;

    const frames = channels[0].length;
    for (let i = 0; i < frames; i++) {
      let sum = 0;
      for (let c = 0; c < channels.length; c++) sum += channels[c][i];
      this.batch[this.filled++] = sum / channels.length;

      if (this.filled === this.batch.length) {
        this.port.postMessage(this.batch.slice());
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
