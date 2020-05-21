import AppLoader from './AppLoader.js';

import Clock from '../../app/clock/clock.js';
import TODOList from '../../app/todolist/TODOList.js';
import Calendar from '../../app/calendar/calendar.js';
import PlayControl from '../../app/playcontrol/playcontrol.js';
import MPD from '../../app/mpd/mpd.js';
import TuneIn from '../../app/tunein/tunein.js';
import Hue from '../../app/hue/hue.js';
import Bible from '../../app/bible/bible.js';

/**
 * Discovers build-in apps in top-level directory app/
 */
export default class BuiltinAppsLoader extends AppLoader {
  async findApps() {
    // TODO dynamically
    let Apps = [ Clock, TODOList, Calendar, MPD, TuneIn, PlayControl, Hue, Bible ];
    let apps = Apps.map(App => new App());
    return apps;
  }
}
