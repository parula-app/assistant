This is a standard voice app that controls the playback of other
media player apps.
This implements uniform playback control across apps.

It picks the last used app that has stop and volume commands,
and calls that app's standard intents. So, the stop, volume etc.
commands always go to the last used media player app.
