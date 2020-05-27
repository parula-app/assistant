# Installation

1. Hardware dependencies
   1. Microphone: You must have a good microphone. Typical computer/notebook microphones are not sufficient.
      * For example, the [Sony PlayStation 3 Eye camera](https://www.amazon.de/dp/B00LME2JGQ/).
   2. Loud speaker, obviously.
   3. Normal desktop CPU.
      * We'll be working on Raspberry Pi 4 support soon. Raspberry Pi 3 will not be supported.
2. Install OS dependencies
   * Ubuntu, Debian etc.
     * `# apt install yarnpkg mpg123 mpd sox libasound2-dev default-jre-headless default-jdk`
   * Fedora, RedHat etc.
     1. Install RPM Fusion \(for mpd\)
        * `# dnf install https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm`
     2. `# dnf install mpg123 mpd sox alsa-lib-devel java-1.8.0-openjdk-headless java-1.8.0-openjdk-devel`
     3. Install Yarn
        1. Complete step 3 below.
        2. `$ npm install -g yarn`
3. Install node.js
   1. Go to the [node.js website](https://nodejs.org/en/) and download node 12 or later.
      * node version 10 in Ubuntu 20.04 is too old.
   2. Extract the archive somewhere.
   3. `ln -s`/your/path/to/node/`/usr/local/bin/node`
4. Install MaryTTS
   1. `git clone https://github.com/marytts/marytts/`
   2. Build it with `./gradlew`
   3. Install voices by running `./gradlew runInstallerGui`
      * en-US `cmu-slt`
      * en-US `cmu-rms`
      * en-GB `dfki-spike`
      * en-GB `dfki-prudence`
   4. Restart the server: `./gradlew run`
   5. Open [http://localhost:59125](http://localhost:59125) in a browser, to check whether the server is running and the voices are listed in the dropdown.
5. Download data files
   1. Download the [Pia app data files](https://pia.im/download/pia-data.tar.bz2)
   2. `cd` to the Pia source directory
   3. `mkdir data`
   4. `cd data/`
   5. `tar xjf /path/to/pia-data.tar.bz2`
   6. Download the [DeepSpeech 0.6.1 models](https://github.com/mozilla/DeepSpeech/releases/download/v0.6.1/deepspeech-0.6.1-models.tar.gz)
      * The DeepSpeech model version needs to match the version of DeepSpeech npm module perfectly.
   7. `tar xzf /path/to/deepspeech-models.tar.gz`
6. Install node packages
   1. `cd` to the Pia source directory
   2. `yarn install`
   3. `cp config-min.json config.json`
7. Run Pia
   1. `cd` to the Pia source directory
   2. `yarn start`
   3. Say "Hey Edison, what time is it?"
   4. Find more commands to say by looking at `app/`\*`/intents.en.json`
8. Configure the applications
9. Create your own voice apps :-\)
   1. [Implement your voice commands](../develop/app/create-the-stub-files.md) in JavaScript, with the help of npm modules.

