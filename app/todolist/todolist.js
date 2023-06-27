import nanoSQL from "@nano-sql/core";
const nSQL = nanoSQL.nSQL;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { assert } from '../../util/util.js';

const kDBName = "TODOList";

export default class TODOList extends JSONApp {
  constructor() {
    super("todolist");
    this._db = null;
  }

  async load(lang) {
    await super.load(lang);

    await nSQL().createDatabase({
      id: kDBName,
      mode: "PERM", // SnapDB
      //path: "~/.parula/db.nano/", TODO not working
      tables: [
        {
          name: "tasks",
          model: {
            "id:uuid": { pk: true },
            "list:string": {},
            "task:string": {},
          }
        }
      ],
      version: 1, // schema version
    });
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   * @param client {ClientAPI}
   */
  async read(args, client) {
    let list = args.List;
    assert(list, "Need list");

    nSQL().useDatabase(kDBName);
    let tasks = await nSQL("tasks").query("select", [
      "task",
    ]).distinct([ "task" ]).where([
      [ "list", "=", list ],
    ]).exec();

    if (!tasks.length) {
      return this.getResponse("list-empty", { list });
    }

    return this.getResponse("list-prefix", {
      count: tasks.length,
      list: list,
    }) + " \n" + tasks.map(taskRow => taskRow.task).join(", ");
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   *   Task {string}
   * @param client {ClientAPI}
   */
  async add(args, client) {
    let task = args.Task;
    let list = args.List;
    assert(task, "Need task to add");
    assert(list, "Need list");

    nSQL().useDatabase(kDBName);
    await nSQL("tasks").query("upsert", {
      task: task,
      list: list,
    }).exec();

    return this.getResponse("added", { task, list });
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   *   Task {string}
   * @param client {ClientAPI}
   */
  async remove(args, client) {
    let task = args.Task;
    let list = args.List;
    assert(task, "Need task to add");
    assert(list, "Need list");

    nSQL().useDatabase(kDBName);
    await nSQL("tasks").query("delete").where([
      [ "list", "=", list ],
      "AND",
      [ "task", "=", task ],
    ]).exec();

    return this.getResponse("removed", { task, list });
  }
}
