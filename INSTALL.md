# Install

1. Hardware dependencies
   1. Microphone: You must have a good microphone. Typical computer/notebook microphones are not sufficient.
      * For example, the [Sony PlayStation 3 Eye camera](https://www.amazon.de/dp/B00LME2JGQ/).
   2. Loud speaker, obviously.
   3. Normal desktop CPU.
      * We'll be working on Raspberry Pi 4 support soon. Raspberry Pi 3 will not be supported.

2. Install OS dependencies
   * `# apt install yarnpkg mpg123 mpd sox libasound2-dev default-jre-headless default-jdk`

3. Install node.js
   1. Go to the [node.js website](https://nodejs.org/en/) and download node 13 or 14 or later.[^nodeversion]
   2. Extract the archive somewhere.
   3. `ln -s `/your/path/to/node/` /usr/local/bin/node`

[^nodeversion]: node version 10 in Ubuntu 20.04 is too old. Does node 12 LTS work?

4. Install MaryTTS
   1. `git clone https://github.com/marytts/marytts/`
   2. Build it with `./gradlew`
   3. Install voices en-US `cmu-slt`, en-US `cmu-rms`, en-GB `dfki-spike`, and en-GB `dfki-prudence` by running `./gradlew runInstallerGui`
   4. Restart the server: `./gradlew run`
   5. Open `http://localhost:59125` in a browser, to check whether the server is running and the voices are listed in the dropdown.

5. Download DeepSpeech models
   1. Download the [DeepSpeech 0.6.1 models](https://github.com/mozilla/DeepSpeech/releases/download/v0.6.1/deepspeech-0.6.1-models.tar.gz).[^modelversion]
   2. Extract them in `../deepspeech/deepspeech-0.6.1-models/`, relative to this file. The path is configurable in `config.json`.

[^modelversion]: The DeepSpeech mode version needs to match the version of DeepSpeech npm module perfectly

6. Install node packages
   1. `cd` to the directory where this file is.
   2. `yarn install`

7. Run Pia
   1. `cd` to the directory where this file is.
   2. `yarn start`
   3. Say "Hey Edison, what time is it?"
   4. Find more commands to say by looking at `app/`*`/intents.en.json`

8. Create your own voice apps :-)
   1. `cp -a app/clock/ app/`yourappname
   2. Change all mentions of `clock` to your app name. The main `.js` filename must match the directory name.
   3. Adapt `intents.en.json` . Also look at the other apps.
   4. Implement your voice commands in JavaScript, with the help of npm modules.

# For apps

## Music library

1. Install mpd with `# apt install mpd`
2. Configure the directory where your music files are.
3. Configure the sound output via PulseAudio and the right sound device.
4. Test it with some native mpd clients.
   1. `# apt install gmpc mpc`
   2. Start menu | Multimedia | GNOME Music Player Client

# Footnotes
