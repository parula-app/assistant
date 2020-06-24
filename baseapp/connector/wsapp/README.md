This is allows Pia voice apps to be running in a separate process.
This is a WebSocket server, representing the Pia core.
The voice app will be a WebSocket client running in a separate process.

When an app starts, it connects to the WebSocket server here,
and registers, by sending its intents JSON. This allows Pia core to
know which commands and values the voice app implements.

The Pia core listens to the commands and values and recognizes them,
and sends the commands to the voice app as invokations using
WebSocket messages. The app runs the intent, and returns the response
via WebSocket, and the Pia core then outputs the response to the user.

These classes here build stubs for each app. A stub is an object that poses
as a Pia voice app object, but doesn't contain the actual implementation,
but forwards all calls via WebSocket messages to the voice app,
calling the intent.
