Contains the built-in voice apps.

They are implemented in JavaScript and run in the same node process.
So, please don't crash or leak ;-) .

The main class must be in a file with the same name as the directory,
e.g. mpd/mpd.js, and be the default export. It must inherit from AppBase.
