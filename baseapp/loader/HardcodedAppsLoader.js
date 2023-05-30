import AppLoader from './AppLoader.js';
import { AppBase } from '../AppBase.js';
import Clock from '../../app/clock/clock.js';
import Radio from '../../app/radio/radio.js';
import TODOList from '../../app/todolist/todolist.js';
import PlayControl from '../../app/playcontrol/playcontrol.js';
import MPD from '../../app/mpd/mpd.js';
import Jokes from '../../app/jokes/jokes.js';
import Hue from '../../app/hue/hue.js';
import Calendar from '../../app/calendar/calendar.js';
import BibleApp from '../../app/bible/bible.js';
import Cities from '../../app/cities/cities.js';

/**
 * Directly references the classes of the built-in apps.
 */
export default class HardcodedAppsLoader extends AppLoader {
  async findApps() {
    let Apps = [
      Clock,
      TODOList,
      PlayControl,
      Radio,
      MPD,
      Calendar,
      Hue,
      BibleApp,
      Jokes,
      Cities,
    ];

    let apps = Apps.map(App => new App())
      .filter(app => app instanceof AppBase);
    return apps;
  }
}
