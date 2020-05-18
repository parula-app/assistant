## Core
* Storage
  * Settings
  * User data
  * Data cache
* Context
  * Include recent commands in match confidence
  * Resolve open variables with context
  * Translate pronouns
* Dynamically load apps
* Apps via commandline (stdin/out) and HTTPS
   * Load language model as JSON via special command parameter / URL suffix
   * Command text input, output, errors etc. via JSON REST protocol.

## Speech
* Better wake word
* Acoustic echo cancellation
* LM
  * Train language model based on commands and values from apps
  * Create Text data type with english vocabulary
* Integrate STT with valid input, see DeepSpeech WithMetadata API
* Better TTS

## Apps
* MPD
* TuneIn
* Bible
* Clock
* TODO list, Shopping list
* Reminder, Alarm
* Calendar
* Contacts
* Phone SIP
* Phone Bluetooth
* Wikipedia
* Google search

## Integration
* Android Intents
* Philips hue
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
