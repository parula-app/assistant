import fetch from 'node-fetch';

const kTTS_URL = "http://localhost:5002";
const kTTS_Bitrate = 22050;

export async function load(args) {
}

export function sampleRate() {
  return kTTS_Bitrate;
}

export async function textToSpeech(text) {
  console.info("Generating speech for: " + text);
  let startTime = new Date();
  let response = await fetch(kTTS_URL + '/api/tts?text=' + encodeURIComponent(text), { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  let blob = await response.blob();
  console.info("Speech generation took " + ((new Date() - startTime) / 1000) + "s");
  //let waveURL = URL.createObjectURL(blob);
  //return await blob.arrayBuffer();
  return blob.stream();
}
