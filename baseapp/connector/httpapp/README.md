This is allows Pia voice apps to be implemented via HTTP.
This is the Pia core part of this protocol.

The voice app will be a HTTP server in a separate process.
Each intent will be a HTTP REST URL and
each intent call a HTTP REST request
from here (these classes) to the Pia voice app. So, this code
here will act as HTTP REST client.

To allow apps to register with the core here, this also implements
a HTTP server with a single URL, which allows the app to register.
The app sends the intents JSON.

We then build stubs for each app here. A stub is an object that poses
as a (Pia voice app) object, but doesn't contain the actual implementation,
but forwards all calls via HTTP REST to the voice app intent.

The voice app responds with either a string, which what we will speak
to the user, or with an error.
