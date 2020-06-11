import jsChess from 'js-chess-engine';
import { JSONApp } from '../../baseapp/JSONApp.js';
import { Obj } from '../../baseapp/datatype/Obj.js';
import { assert } from '../../util/util.js';

/**
 * @see https://github.com/josefjadrny/js-chess-engine
 */
export default class Chess extends JSONApp {
  constructor() {
    super("chess");
  }

  /**
   * Keeps chess board state in
   * `ClientAPI.userSession` with key "chess"
   * That's all that the lib needs.
   *
   * @param client {ClientAPI}
   * @returns {jsChess.Game}
   */
  game(client) {
    let game = client.userSession.get("chess").game;
    if (!game) {
      throw this.error("no-active-game");
    }
    return game;
  }

  /**
   * @param args {
   *   Color {string enum}, (Optional) w = white or b = black, default w = white
   * }
   * @param client {ClientAPI}
   */
  startGame(args, client) {
    let game = new jsChess.Game();

    let playerColor = "w";
    if (args.Color) {
      playerColor = args.Color;
    }
    client.userSession.set("chess", {
      game: game,
      playerColor: playerColor,
    });
    return this.getResponse("started");
  }

  /**
   * @param args {
   *   FromFile {string enum}, one of: ABCDEFEGH
   *   FromRank {string enum}, one of: 12345678
   *   ToFile {string enum}, one of: ABCDEFEGH
   *   ToRank {string enum}, one of: 12345678
   *   Piece {string enum}, (Optional) one of: KQNBRP
   * }
   * @param client {ClientAPI}
   */
  move(args, client) {
    assert(args.FromFile, "Need to know from where you want to move");
    assert(args.ToFile, "Need to know to where you want to move");
    this.validateRank(args.FromRank);
    this.validateRank(args.ToRank);
    let argFrom = args.FromFile + args.FromRank;
    let argTo = args.ToFile + args.ToRank;
    let game = this.game(client);

    if (args.Piece) {
      // verify that piece is at the given from position is correct
      let isFrom = this.pieceToPlace(game, client, args.Piece);
      if (argFrom != isFrom) {
        return this.error("wrong-position", {
          position: args.FromFile + " " + args.FromRank,
        });
      }
    }

    game.move(argFrom, argTo);
    return this.aiMove(game);
  }

  /**
   * @param args {
   *   Piece {string enum}, one of: KQNBRP
   *   ToFile {string enum}, one of: ABCDEFEGH
   *   ToRank {string enum}, one of: 12345678
   * }
   * @param client {ClientAPI}
   */
  movePiece(args, client) {
    assert(args.Piece, "Need to know which piece you want to move");
    assert(args.ToFile, "Need to know to where you want to move");
    this.validateRank(args.ToRank);
    let argTo = args.ToFile + args.ToRank;
    let game = this.game(client);
    let argFrom = this.pieceToPlace(game, client, args.Piece);
    game.move(argFrom, argTo);
    return this.aiMove(game);
  }

  /**
   * @param piece {string enum} one of: KQNBRP
   * @param client {ClientAPI}
   */
  pieceToPlace(game, client, piece) {
    let playerColor = client.userSession.get("chess").playerColor;
    if (playerColor == "b") { // black
      piece = piece.toLowerCase();
    }
    // @see https://github.com/josefjadrny/js-chess-engine#board-configuration
    let pieces = game.exportJson().pieces;
    return Object.entries(pieces).find(([pos, pieceAtPos]) => pieceAtPos == piece);
  }

  /**
   * Let computer make its move.
   * @param position {string} e.g. "A2"
   * @returns {string enum} piece, one of: KQNBRP or kqnbrp
   */
  placeToPiece(game, position) {
    let pieces = game.exportJson().pieces;
    let entry = Object.entries(pieces).find(([pos, pieceAtPos]) => pos == position);
    assert(entry, "There is no piece at position " + position);
    return entry[1];
  }

  /**
   * Let the computer make its move.
   * @returns {string} Response to the user, telling him which move the computer made
   */
  aiMove(game) {
    // 1 = Beginner, needs ~0.1s
    // 2 = Advanced, needs ~3s
    const kAISmartnessLevel = 2;
    //let move = game.aiMove(kAISmartnessLevel); -- doesn't return the move
    let move = game.board.calculateAiMove(kAISmartnessLevel)
    game.move(move.from, move.to)
    console.log(move);
    let pieceName = this.getResponse("piece-" + this.placeToPiece(game, move.from).toUpperCase());
    return this.getResponse("computer-moved", {
      piece: pieceName,
      from: move.from,
      to: move.to,
    });
  }

  validateRank(rank) {
    if (!rank || rank < 1 || rank > 8) {
      throw this.error("invalid-rank", { rank });
    }
  }
}
