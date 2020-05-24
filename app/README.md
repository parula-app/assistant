Contains the built-in voice apps.

They are implemented in JavaScript and run in the same node process as Pia.
So, please don't crash or leak ;-) .

The main class must be in a file with the same name as the directory,
e.g. mpd/mpd.js, be the default export, and inherit from `AppBase`.

How to create your own voice app: <https://docs.pia.im/develop/app/>.
