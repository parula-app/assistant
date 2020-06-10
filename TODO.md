## Core
* Intent Parser
  * NamedValues with scores
  * Based on words
* Context
  * Include recent commands in match confidence
  * Resolve open variables with context
  * Translate pronouns
* Modifier words, before or after intent matching
  * please, can you, could you, would you, tell me (removed, or increases politeness in response)
  * quickly (reduces reponse length)
  * again (takes variables from previous commands)
* Apps via commandline (stdin/out) and HTTPS
   * Load language model as JSON via special command parameter / URL suffix
   * Command text input, output, errors etc. via JSON REST protocol.
* Storage
  * Settings writable
  * Decide on DB

## Speech
* Better wake word
* Acoustic echo cancellation
* Language Model, 4 cases:
  * Commands from apps
  * Data types, like datetime, locations, and values from apps
  * Modifier words (see above)
  * Text data type with english vocabulary
* Go back to speech recognition with valid input
  * Let speech recognition re-run on values, with limited vocabulary. See e.g. DateTime.
  * DeepSpeech WithMetadata API
  * DeepSpeech scorer?
* Better TTS

# Apps
## Done
* MPD
* Radio
* Bible
* Clock
* TODO list, Shopping list
* Lights for Hue
* Jokes

## TODO
* Reminder, Alarm
* Contacts
* Weather
* Calendar
  * Sync only when necessary
* Phone SIP
* Phone Bluetooth
  * HFP Hands Free Profile or HSP Headset -> PulseAudio
  * PBAP Phone Book Access Profile
  * MAP Message Access Profile
* Wikipedia
* Google search

## Integration
* Android Intents
* Node Red
* Home Assistant <https://www.home-assistant.io>
* ThingVerse, Almond, LUInet <https://almond.stanford.edu/thingpedia>
* MyCroft <https://github.com/MycroftAI/mycroft-skills>

## API
* HTTP app
* Commandline app
* Apps provide functions
  * E.g. App 1 has command: "Call {PhoneNumber}", App 2 has function: string {Name} -> {ContactPerson} -> {PhoneNumber}
  * System builds path from string to required type to command to result render
* Need common ontology
  * Defines common high-level data types (e.g. Person, PhoneNumber) etc.
  * with specialisation: MobileNumber is a PhoneNumber, Actor is a Person
  * Apps must implement this ontology wherever applicable
  * Makes system pluggable, coherent, like iPhone
* Data types pluggable
  * Time, date
  * Contacts: person -> phone number, email address
  * Location
  * E.g. App 1 has variable of data type. App 2 can map input to this data type.
  * Several apps can register as providers for the same data type. All are queried in parallel, and the highest confidence result is used. If app implements both the command and the data type used app, only this app is used for data type query.
* Command results
  * Audio stream, URL, mp3 or wave, with play control
  * Video stream, URL, MPEG4, H.264, etc., with play control
  * E.g. Command: "Call to {Person}" -> App: Phone SIP -> Command Result: 2 channel audio/video -> Built-in audio
  * E.g. Command: "Message to {Person} -> Function: Contacts, with contact method preference for this person -> App: SMS, WhatsApp, Signal, depending on preference for this person
  * Apps can implement command result types
    * Built-in speaker
    * Android video app
    * TV
    * Phone call

## Help needed
* Better TTS
* Raspberry Pi 4
  * Input device
  * DeepSpeech TFLite
* Setup
  * GUI as webapp with React
  * Auto config
     * Hue
     * Email
