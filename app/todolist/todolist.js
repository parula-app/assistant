import { JSONApp } from '../../baseapp/JSONApp.js';
import { assert } from '../../util/util.js';
import nanoSQL from "@nano-sql/core";
const nSQL = nanoSQL.nSQL;

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
   * @param list {string}
   * @return {Array of string}
   */
  async getTasks(list) {
    nSQL().useDatabase(kDBName);
    let results = await nSQL("tasks").query("select", [
      "task",
    ]).distinct([ "task" ]).where([
      [ "list", "=", list ],
    ]).exec()
    return results.map(taskRow => taskRow.task);
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async read(args, client, context) {
    let list = args.List;
    assert(list, "Need list");
    let tasks = this.getTasks(list);

    if (!tasks.length) {
      return this.getResponse("list-empty", { list });
    }

    context.addResult(tasks, this.dataTypes.List);
    return this.getResponse("list-prefix", {
      count: tasks.length,
      list: list,
    }) + " \n" + tasks.join(", ");
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   *   Task {string}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async add(args, client, context) {
    let task = args.Task;
    let list = args.List;
    assert(task, "Need task to add");
    assert(list, "Need list");

    nSQL().useDatabase(kDBName);
    await nSQL("tasks").query("upsert", {
      task: task,
      list: list,
    }).exec();

    context.addResult(await this.getTasks(list), this.dataTypes.List);
    return this.getResponse("added", { task, list });
  }

  /**
   * Command
   * @param args {obj}
   *   List {string} e.g. "TODO" or "shopping"
   *   Task {string}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async remove(args, client, context) {
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

    context.addResult(await this.getTasks(list), this.dataTypes.List);
    return this.getResponse("removed", { task, list });
  }
}
