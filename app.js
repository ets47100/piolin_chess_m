// node_modules/@lichess-org/chessground/dist/types.js
var colors = ["white", "black"];
var files = ["a", "b", "c", "d", "e", "f", "g", "h"];
var ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

// node_modules/@lichess-org/chessground/dist/util.js
var invRanks = [...ranks].reverse();
var allKeys = files.flatMap((f) => ranks.map((r) => f + r));
var pos2key = (pos) => pos.every((x) => x >= 0 && x <= 7) ? allKeys[8 * pos[0] + pos[1]] : void 0;
var pos2keyUnsafe = (pos) => pos2key(pos);
var key2pos = (k) => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];
var allPos = allKeys.map(key2pos);
var allPosAndKey = allKeys.map((key2, i) => ({ key: key2, pos: allPos[i] }));
function memo(f) {
  let v;
  const ret = () => {
    if (v === void 0)
      v = f();
    return v;
  };
  ret.clear = () => {
    v = void 0;
  };
  return ret;
}
var timer = () => {
  let startAt;
  return {
    start() {
      startAt = performance.now();
    },
    cancel() {
      startAt = void 0;
    },
    stop() {
      if (!startAt)
        return 0;
      const time = performance.now() - startAt;
      startAt = void 0;
      return time;
    }
  };
};
var opposite = (c) => c === "white" ? "black" : "white";
var distanceSq = (pos1, pos2) => (pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2;
var samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
var samePos = (p1, p2) => p1[0] === p2[0] && p1[1] === p2[1];
var posToTranslate = (bounds) => (pos, asWhite) => [
  (asWhite ? pos[0] : 7 - pos[0]) * bounds.width / 8,
  (asWhite ? 7 - pos[1] : pos[1]) * bounds.height / 8
];
var translate = (el, pos) => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};
var translateAndScale = (el, pos, scale = 1) => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px) scale(${scale})`;
};
var setVisible = (el, v) => {
  el.style.display = v ? "" : "none";
};
var eventPosition = (e) => {
  if (e.clientX || e.clientX === 0)
    return [e.clientX, e.clientY];
  if (e.targetTouches?.[0])
    return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return void 0;
};
var isFireMac = memo(() => !("ontouchstart" in window) && ["macintosh", "firefox"].every((x) => navigator.userAgent.toLowerCase().includes(x)));
var isRightButton = (e) => e.button === 2 && !(e.ctrlKey && isFireMac());
var createEl = (tagName, className) => {
  const el = document.createElement(tagName);
  if (className)
    el.className = className;
  return el;
};
function computeSquareCenter(key2, asWhite, bounds) {
  const pos = key2pos(key2);
  if (!asWhite) {
    pos[0] = 7 - pos[0];
    pos[1] = 7 - pos[1];
  }
  return [
    bounds.left + bounds.width * pos[0] / 8 + bounds.width / 16,
    bounds.top + bounds.height * (7 - pos[1]) / 8 + bounds.height / 16
  ];
}
var diff = (a, b) => Math.abs(a - b);
var knightDir = (x1, y1, x2, y2) => diff(x1, x2) * diff(y1, y2) === 2;
var rookDir = (x1, y1, x2, y2) => x1 === x2 !== (y1 === y2);
var bishopDir = (x1, y1, x2, y2) => diff(x1, x2) === diff(y1, y2) && x1 !== x2;
var queenDir = (x1, y1, x2, y2) => rookDir(x1, y1, x2, y2) || bishopDir(x1, y1, x2, y2);
var kingDirNonCastling = (x1, y1, x2, y2) => Math.max(diff(x1, x2), diff(y1, y2)) === 1;
var pawnDirAdvance = (x1, y1, x2, y2, isDirectionUp) => {
  const step2 = isDirectionUp ? 1 : -1;
  return x1 === x2 && (y2 === y1 + step2 || // allow 2 squares from first two ranks, for horde
  y2 === y1 + 2 * step2 && (isDirectionUp ? y1 <= 1 : y1 >= 6));
};
var squaresBetween = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx && dy && Math.abs(dx) !== Math.abs(dy))
    return [];
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const squares = [];
  let x = x1 + stepX, y = y1 + stepY;
  while (x !== x2 || y !== y2) {
    squares.push([x, y]);
    x += stepX;
    y += stepY;
  }
  return squares.map(pos2key).filter((k) => k !== void 0);
};

// node_modules/@lichess-org/chessground/dist/anim.js
var anim = (mutation, state) => state.animation.enabled ? animate(mutation, state) : render(mutation, state);
function render(mutation, state) {
  const result = mutation(state);
  state.dom.redraw();
  return result;
}
var makePiece = (key2, piece) => ({
  key: key2,
  pos: key2pos(key2),
  piece
});
var closer = (piece, pieces) => pieces.sort((p1, p2) => distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos))[0];
function computePlan(prevPieces, current) {
  const anims = /* @__PURE__ */ new Map(), animedOrigs = [], fadings = /* @__PURE__ */ new Map(), missings = [], news = [], prePieces = /* @__PURE__ */ new Map();
  let curP, preP, vector;
  for (const [k, p] of prevPieces) {
    prePieces.set(k, makePiece(k, p));
  }
  for (const key2 of allKeys) {
    curP = current.pieces.get(key2);
    preP = prePieces.get(key2);
    if (curP) {
      if (preP) {
        if (!samePiece(curP, preP.piece)) {
          missings.push(preP);
          news.push(makePiece(key2, curP));
        }
      } else
        news.push(makePiece(key2, curP));
    } else if (preP)
      missings.push(preP);
  }
  for (const newP of news) {
    preP = closer(newP, missings.filter((p) => samePiece(newP.piece, p.piece)));
    if (preP) {
      vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
      anims.set(newP.key, vector.concat(vector));
      animedOrigs.push(preP.key);
    }
  }
  for (const p of missings) {
    if (!animedOrigs.includes(p.key))
      fadings.set(p.key, p.piece);
  }
  return {
    anims,
    fadings
  };
}
function step(state, now) {
  const cur = state.animation.current;
  if (cur === void 0) {
    if (!state.dom.destroyed)
      state.dom.redrawNow();
    return;
  }
  const rest = 1 - (now - cur.start) * cur.frequency;
  if (rest <= 0) {
    state.animation.current = void 0;
    state.dom.redrawNow();
  } else {
    const ease = easing(rest);
    for (const cfg of cur.plan.anims.values()) {
      cfg[2] = cfg[0] * ease;
      cfg[3] = cfg[1] * ease;
    }
    state.dom.redrawNow(true);
    requestAnimationFrame((now2 = performance.now()) => step(state, now2));
  }
}
function animate(mutation, state) {
  const prevPieces = new Map(state.pieces);
  const result = mutation(state);
  const plan = computePlan(prevPieces, state);
  if (plan.anims.size || plan.fadings.size) {
    const alreadyRunning = state.animation.current && state.animation.current.start;
    state.animation.current = {
      start: performance.now(),
      frequency: 1 / state.animation.duration,
      plan
    };
    if (!alreadyRunning)
      step(state, performance.now());
  } else {
    state.dom.redraw();
  }
  return result;
}
var easing = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// node_modules/@lichess-org/chessground/dist/premove.js
var pawn = (ctx) => diff(ctx.orig.pos[0], ctx.dest.pos[0]) <= 1 && (diff(ctx.orig.pos[0], ctx.dest.pos[0]) === 1 ? ctx.dest.pos[1] === ctx.orig.pos[1] + (ctx.color === "white" ? 1 : -1) : pawnDirAdvance(...ctx.orig.pos, ...ctx.dest.pos, ctx.color === "white"));
var knight = (ctx) => knightDir(...ctx.orig.pos, ...ctx.dest.pos);
var bishop = (ctx) => bishopDir(...ctx.orig.pos, ...ctx.dest.pos);
var rook = (ctx) => rookDir(...ctx.orig.pos, ...ctx.dest.pos);
var queen = (ctx) => bishop(ctx) || rook(ctx);
var king = (ctx) => kingDirNonCastling(...ctx.orig.pos, ...ctx.dest.pos) || ctx.orig.pos[1] === ctx.dest.pos[1] && ctx.orig.pos[1] === (ctx.color === "white" ? 0 : 7) && (ctx.orig.pos[0] === 4 && (ctx.dest.pos[0] === 2 && ctx.rookFilesFriendlies.includes(0) || ctx.dest.pos[0] === 6 && ctx.rookFilesFriendlies.includes(7)) || ctx.rookFilesFriendlies.includes(ctx.dest.pos[0]));
var mobilityByRole = { pawn, knight, bishop, rook, queen, king };
function premove(state, key2) {
  const pieces = state.pieces;
  const piece = pieces.get(key2);
  if (!piece || piece.color === state.turnColor)
    return [];
  const color = piece.color, friendlies = new Map([...pieces].filter(([_, p]) => p.color === color)), enemies = new Map([...pieces].filter(([_, p]) => p.color === opposite(color))), orig = { key: key2, pos: key2pos(key2) }, mobility = (ctx) => mobilityByRole[piece.role](ctx) && state.premovable.additionalPremoveRequirements(ctx), partialCtx = {
    orig,
    role: piece.role,
    allPieces: pieces,
    friendlies,
    enemies,
    color,
    rookFilesFriendlies: Array.from(pieces).filter(([k, p]) => k[1] === (color === "white" ? "1" : "8") && p.color === color && p.role === "rook").map(([k]) => key2pos(k)[0]),
    lastMove: state.lastMove
  };
  return allPosAndKey.filter((dest) => mobility({ ...partialCtx, dest })).map((pk) => pk.key);
}

// node_modules/@lichess-org/chessground/dist/board.js
function callUserFunction(f, ...args) {
  if (f)
    setTimeout(() => f(...args), 1);
}
function toggleOrientation(state) {
  state.orientation = opposite(state.orientation);
  state.animation.current = state.draggable.current = state.selected = void 0;
}
function setPieces(state, pieces) {
  for (const [key2, piece] of pieces) {
    if (piece)
      state.pieces.set(key2, piece);
    else
      state.pieces.delete(key2);
  }
}
function setCheck(state, color) {
  state.check = void 0;
  if (color === true)
    color = state.turnColor;
  if (color)
    for (const [k, p] of state.pieces) {
      if (p.role === "king" && p.color === color) {
        state.check = k;
      }
    }
}
function setPremove(state, orig, dest, meta) {
  unsetPredrop(state);
  state.premovable.current = [orig, dest];
  callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
  if (state.premovable.current) {
    state.premovable.current = void 0;
    callUserFunction(state.premovable.events.unset);
  }
}
function setPredrop(state, role, key2) {
  unsetPremove(state);
  state.predroppable.current = { role, key: key2 };
  callUserFunction(state.predroppable.events.set, role, key2);
}
function unsetPredrop(state) {
  const pd = state.predroppable;
  if (pd.current) {
    pd.current = void 0;
    callUserFunction(pd.events.unset);
  }
}
function tryAutoCastle(state, orig, dest) {
  if (!state.autoCastle)
    return false;
  const king2 = state.pieces.get(orig);
  if (!king2 || king2.role !== "king")
    return false;
  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  if (origPos[1] !== 0 && origPos[1] !== 7 || origPos[1] !== destPos[1])
    return false;
  if (origPos[0] === 4 && !state.pieces.has(dest)) {
    if (destPos[0] === 6)
      dest = pos2keyUnsafe([7, destPos[1]]);
    else if (destPos[0] === 2)
      dest = pos2keyUnsafe([0, destPos[1]]);
  }
  const rook2 = state.pieces.get(dest);
  if (!rook2 || rook2.color !== king2.color || rook2.role !== "rook")
    return false;
  state.pieces.delete(orig);
  state.pieces.delete(dest);
  if (origPos[0] < destPos[0]) {
    state.pieces.set(pos2keyUnsafe([6, destPos[1]]), king2);
    state.pieces.set(pos2keyUnsafe([5, destPos[1]]), rook2);
  } else {
    state.pieces.set(pos2keyUnsafe([2, destPos[1]]), king2);
    state.pieces.set(pos2keyUnsafe([3, destPos[1]]), rook2);
  }
  return true;
}
function tryEnPassant(state, orig, dest) {
  const origPiece = state.pieces.get(orig);
  if (!origPiece || origPiece.role !== "pawn")
    return void 0;
  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  if (origPos[0] === destPos[0])
    return void 0;
  if (state.pieces.has(dest))
    return void 0;
  const captureKey = pos2key([destPos[0], origPos[1]]);
  if (!captureKey)
    return void 0;
  const captured = state.pieces.get(captureKey);
  if (!captured || captured.color === origPiece.color || captured.role !== "pawn")
    return void 0;
  state.pieces.delete(captureKey);
  return captured;
}
function baseMove(state, orig, dest) {
  const origPiece = state.pieces.get(orig), destPiece = state.pieces.get(dest);
  if (orig === dest || !origPiece)
    return false;
  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : tryEnPassant(state, orig, dest);
  if (dest === state.selected)
    unselect(state);
  callUserFunction(state.events.move, orig, dest, captured);
  if (!tryAutoCastle(state, orig, dest)) {
    state.pieces.set(dest, origPiece);
    state.pieces.delete(orig);
  }
  state.lastMove = [orig, dest];
  state.check = void 0;
  callUserFunction(state.events.change);
  return captured || true;
}
function baseNewPiece(state, piece, key2, force) {
  if (state.pieces.has(key2)) {
    if (force)
      state.pieces.delete(key2);
    else
      return false;
  }
  callUserFunction(state.events.dropNewPiece, piece, key2);
  state.pieces.set(key2, piece);
  state.lastMove = [key2];
  state.check = void 0;
  callUserFunction(state.events.change);
  state.movable.dests = void 0;
  state.turnColor = opposite(state.turnColor);
  return true;
}
function baseUserMove(state, orig, dest) {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = void 0;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = void 0;
  }
  return result;
}
function userMove(state, orig, dest) {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime
      };
      if (result !== true)
        metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  } else if (canPremove(state, orig, dest)) {
    setPremove(state, orig, dest, {
      ctrlKey: state.stats.ctrlKey
    });
    unselect(state);
    return true;
  }
  unselect(state);
  return false;
}
function dropNewPiece(state, orig, dest, force) {
  const piece = state.pieces.get(orig);
  if (piece && (canDrop(state, orig, dest) || force)) {
    state.pieces.delete(orig);
    baseNewPiece(state, piece, dest, force);
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
      premove: false,
      predrop: false
    });
  } else if (piece && canPredrop(state, orig, dest)) {
    setPredrop(state, piece.role, dest);
  } else {
    unsetPremove(state);
    unsetPredrop(state);
  }
  state.pieces.delete(orig);
  unselect(state);
}
function selectSquare(state, key2, force) {
  callUserFunction(state.events.select, key2);
  if (state.selected) {
    if (state.selected === key2 && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key2) {
      if (userMove(state, state.selected, key2)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if ((state.selectable.enabled || state.draggable.enabled) && (isMovable(state, key2) || isPremovable(state, key2))) {
    setSelected(state, key2);
    state.hold.start();
  }
}
function setSelected(state, key2) {
  state.selected = key2;
  if (!isPremovable(state, key2))
    state.premovable.dests = void 0;
  else if (!state.premovable.customDests)
    state.premovable.dests = premove(state, key2);
}
function unselect(state) {
  state.selected = void 0;
  state.premovable.dests = void 0;
  state.hold.cancel();
}
function isMovable(state, orig) {
  const piece = state.pieces.get(orig);
  return !!piece && (state.movable.color === "both" || state.movable.color === piece.color && state.turnColor === piece.color);
}
var canMove = (state, orig, dest) => orig !== dest && isMovable(state, orig) && (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest));
function canDrop(state, orig, dest) {
  const piece = state.pieces.get(orig);
  return !!piece && (orig === dest || !state.pieces.has(dest)) && (state.movable.color === "both" || state.movable.color === piece.color && state.turnColor === piece.color);
}
function isPremovable(state, orig) {
  const piece = state.pieces.get(orig);
  return !!piece && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
}
var canPremove = (state, orig, dest) => orig !== dest && isPremovable(state, orig) && (state.premovable.customDests?.get(orig) ?? premove(state, orig)).includes(dest);
function canPredrop(state, orig, dest) {
  const piece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);
  return !!piece && (!destPiece || destPiece.color !== state.movable.color) && state.predroppable.enabled && (piece.role !== "pawn" || dest[1] !== "1" && dest[1] !== "8") && state.movable.color === piece.color && state.turnColor !== piece.color;
}
function isDraggable(state, orig) {
  const piece = state.pieces.get(orig);
  return !!piece && state.draggable.enabled && (state.movable.color === "both" || state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled));
}
function playPremove(state) {
  const move3 = state.premovable.current;
  if (!move3)
    return false;
  const orig = move3[0], dest = move3[1];
  let success = false;
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const metadata = { premove: true };
      if (result !== true)
        metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      success = true;
    }
  }
  unsetPremove(state);
  return success;
}
function playPredrop(state, validate) {
  const drop2 = state.predroppable.current;
  let success = false;
  if (!drop2)
    return false;
  if (validate(drop2)) {
    const piece = {
      role: drop2.role,
      color: state.movable.color
    };
    if (baseNewPiece(state, piece, drop2.key)) {
      callUserFunction(state.movable.events.afterNewPiece, drop2.role, drop2.key, {
        premove: false,
        predrop: true
      });
      success = true;
    }
  }
  unsetPredrop(state);
  return success;
}
function cancelMove(state) {
  unsetPremove(state);
  unsetPredrop(state);
  unselect(state);
}
function stop(state) {
  state.movable.color = state.movable.dests = state.animation.current = void 0;
  cancelMove(state);
}
function getKeyAtDomPos(pos, asWhite, bounds) {
  let file2 = Math.floor(8 * (pos[0] - bounds.left) / bounds.width);
  if (!asWhite)
    file2 = 7 - file2;
  let rank2 = 7 - Math.floor(8 * (pos[1] - bounds.top) / bounds.height);
  if (!asWhite)
    rank2 = 7 - rank2;
  return file2 >= 0 && file2 < 8 && rank2 >= 0 && rank2 < 8 ? pos2key([file2, rank2]) : void 0;
}
function getSnappedKeyAtDomPos(orig, pos, asWhite, bounds) {
  const origPos = key2pos(orig);
  const validSnapPos = allPos.filter((pos2) => samePos(origPos, pos2) || queenDir(origPos[0], origPos[1], pos2[0], pos2[1]) || knightDir(origPos[0], origPos[1], pos2[0], pos2[1]));
  const validSnapCenters = validSnapPos.map((pos2) => computeSquareCenter(pos2keyUnsafe(pos2), asWhite, bounds));
  const validSnapDistances = validSnapCenters.map((pos2) => distanceSq(pos, pos2));
  const [, closestSnapIndex] = validSnapDistances.reduce((a, b, index) => a[0] < b ? a : [b, index], [validSnapDistances[0], 0]);
  return pos2key(validSnapPos[closestSnapIndex]);
}
var whitePov = (s) => s.orientation === "white";

// node_modules/@lichess-org/chessground/dist/fen.js
var initial = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
var roles = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king"
};
var letters = {
  pawn: "p",
  rook: "r",
  knight: "n",
  bishop: "b",
  queen: "q",
  king: "k"
};
function read(fen) {
  if (fen === "start")
    fen = initial;
  const pieces = /* @__PURE__ */ new Map();
  let row = 7, col = 0;
  for (const c of fen) {
    switch (c) {
      case " ":
      case "[":
        return pieces;
      case "/":
        --row;
        if (row < 0)
          return pieces;
        col = 0;
        break;
      case "~": {
        const k = pos2key([col - 1, row]);
        const piece = k && pieces.get(k);
        if (piece)
          piece.promoted = true;
        break;
      }
      default: {
        const nb = c.charCodeAt(0);
        if (nb < 57)
          col += nb - 48;
        else {
          const role = c.toLowerCase();
          const key2 = pos2key([col, row]);
          if (key2)
            pieces.set(key2, {
              role: roles[role],
              color: c === role ? "black" : "white"
            });
          ++col;
        }
      }
    }
  }
  return pieces;
}
function write(pieces) {
  return invRanks.map((y) => files.map((x) => {
    const piece = pieces.get(x + y);
    if (piece) {
      let p = letters[piece.role];
      if (piece.color === "white")
        p = p.toUpperCase();
      if (piece.promoted)
        p += "~";
      return p;
    } else
      return "1";
  }).join("")).join("/").replace(/1{2,}/g, (s) => s.length.toString());
}

// node_modules/@lichess-org/chessground/dist/config.js
function applyAnimation(state, config) {
  if (config.animation) {
    deepMerge(state.animation, config.animation);
    if ((state.animation.duration || 0) < 70)
      state.animation.enabled = false;
  }
}
function configure(state, config) {
  if (config.movable?.dests)
    state.movable.dests = void 0;
  if (config.drawable?.autoShapes)
    state.drawable.autoShapes = [];
  deepMerge(state, config);
  if (config.fen) {
    state.pieces = read(config.fen);
    state.drawable.shapes = config.drawable?.shapes || [];
  }
  if ("check" in config)
    setCheck(state, config.check || false);
  if ("lastMove" in config && !config.lastMove)
    state.lastMove = void 0;
  else if (config.lastMove)
    state.lastMove = config.lastMove;
  if (state.selected)
    setSelected(state, state.selected);
  applyAnimation(state, config);
  if (!state.movable.rookCastle && state.movable.dests) {
    const rank2 = state.movable.color === "white" ? "1" : "8", kingStartPos = "e" + rank2, dests = state.movable.dests.get(kingStartPos), king2 = state.pieces.get(kingStartPos);
    if (!dests || !king2 || king2.role !== "king")
      return;
    state.movable.dests.set(kingStartPos, dests.filter((d) => !(d === "a" + rank2 && dests.includes("c" + rank2)) && !(d === "h" + rank2 && dests.includes("g" + rank2))));
  }
}
function deepMerge(base, extend) {
  for (const key2 in extend) {
    if (key2 === "__proto__" || key2 === "constructor" || !Object.prototype.hasOwnProperty.call(extend, key2))
      continue;
    if (Object.prototype.hasOwnProperty.call(base, key2) && isPlainObject(base[key2]) && isPlainObject(extend[key2]))
      deepMerge(base[key2], extend[key2]);
    else
      base[key2] = extend[key2];
  }
}
function isPlainObject(o) {
  if (typeof o !== "object" || o === null)
    return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

// node_modules/@lichess-org/chessground/dist/draw.js
var brushes = ["green", "red", "blue", "yellow"];
function start(state, e) {
  if (e.touches && e.touches.length > 1)
    return;
  e.stopPropagation();
  e.preventDefault();
  if (e.ctrlKey) {
    unselect(state);
  } else {
    cancelMove(state);
  }
  const pos = eventPosition(e), orig = getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
  if (!orig)
    return;
  state.drawable.current = {
    orig,
    pos,
    brush: eventBrush(e),
    snapToValidMove: state.drawable.defaultSnapToValidMove
  };
  processDraw(state);
}
function processDraw(state) {
  requestAnimationFrame(() => {
    const cur = state.drawable.current;
    if (cur) {
      const keyAtDomPos = getKeyAtDomPos(cur.pos, whitePov(state), state.dom.bounds());
      if (!keyAtDomPos) {
        cur.snapToValidMove = false;
      }
      const mouseSq = cur.snapToValidMove ? getSnappedKeyAtDomPos(cur.orig, cur.pos, whitePov(state), state.dom.bounds()) : keyAtDomPos;
      if (mouseSq !== cur.mouseSq) {
        cur.mouseSq = mouseSq;
        cur.dest = mouseSq !== cur.orig ? mouseSq : void 0;
        state.dom.redrawNow();
      }
      processDraw(state);
    }
  });
}
function move(state, e) {
  if (state.drawable.current)
    state.drawable.current.pos = eventPosition(e);
}
function end(state) {
  const cur = state.drawable.current;
  if (cur) {
    if (cur.mouseSq)
      addShape(state.drawable, cur);
    cancel(state);
  }
}
function cancel(state) {
  if (state.drawable.current) {
    state.drawable.current = void 0;
    state.dom.redraw();
  }
}
function clear(state) {
  if (state.drawable.shapes.length) {
    state.drawable.shapes = [];
    state.dom.redraw();
    onChange(state.drawable);
  }
}
var sameEndpoints = (s1, s2) => s1.orig === s2.orig && s1.dest === s2.dest;
var sameColor = (s1, s2) => s1.brush === s2.brush;
function eventBrush(e) {
  const modA = (e.shiftKey || e.ctrlKey) && isRightButton(e);
  const modB = e.altKey || e.metaKey || e.getModifierState?.("AltGraph");
  return brushes[(modA ? 1 : 0) + (modB ? 2 : 0)];
}
function addShape(drawable, cur) {
  const similar = drawable.shapes.find((s) => sameEndpoints(s, cur));
  if (similar)
    drawable.shapes = drawable.shapes.filter((s) => !sameEndpoints(s, cur));
  if (!similar || !sameColor(similar, cur))
    drawable.shapes.push({
      orig: cur.orig,
      dest: cur.dest,
      brush: cur.brush
    });
  onChange(drawable);
}
function onChange(drawable) {
  if (drawable.onChange)
    drawable.onChange(drawable.shapes);
}

// node_modules/@lichess-org/chessground/dist/drag.js
function start2(s, e) {
  if (!(s.trustAllEvents || e.isTrusted))
    return;
  if (e.buttons !== void 0 && e.buttons > 1)
    return;
  if (e.touches && e.touches.length > 1)
    return;
  const bounds = s.dom.bounds(), position = eventPosition(e), orig = getKeyAtDomPos(position, whitePov(s), bounds);
  if (!orig)
    return;
  const piece = s.pieces.get(orig);
  const previouslySelected = s.selected;
  if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnMovablePieceClick || !piece || piece.color !== s.turnColor))
    clear(s);
  if (e.cancelable !== false && (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position)))
    e.preventDefault();
  else if (e.touches)
    return;
  const hadPremove = !!s.premovable.current;
  const hadPredrop = !!s.predroppable.current;
  s.stats.ctrlKey = e.ctrlKey;
  if (s.selected && canMove(s, s.selected, orig)) {
    anim((state) => selectSquare(state, orig), s);
  } else {
    selectSquare(s, orig);
  }
  const stillSelected = s.selected === orig;
  const element = pieceElementByKey(s, orig);
  if (piece && element && stillSelected && isDraggable(s, orig)) {
    s.draggable.current = {
      orig,
      piece,
      origPos: position,
      pos: position,
      started: s.draggable.autoDistance && s.stats.dragged,
      element,
      previouslySelected,
      originTarget: e.target,
      keyHasChanged: false
    };
    element.cgDragging = true;
    element.classList.add("dragging");
    const ghost = s.dom.elements.ghost;
    if (ghost) {
      ghost.className = `ghost ${piece.color} ${piece.role}`;
      translate(ghost, posToTranslate(bounds)(key2pos(orig), whitePov(s)));
      setVisible(ghost, true);
    }
    processDrag(s);
  } else {
    if (hadPremove)
      unsetPremove(s);
    if (hadPredrop)
      unsetPredrop(s);
  }
  s.dom.redraw();
}
function pieceCloseTo(s, pos) {
  const asWhite = whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(s.touchIgnoreRadius * bounds.width / 16, 2) * 2;
  for (const key2 of s.pieces.keys()) {
    const center = computeSquareCenter(key2, asWhite, bounds);
    if (distanceSq(center, pos) <= radiusSq)
      return true;
  }
  return false;
}
function dragNewPiece(s, piece, e, force) {
  const key2 = "a0";
  s.pieces.set(key2, piece);
  s.dom.redraw();
  const position = eventPosition(e);
  s.draggable.current = {
    orig: key2,
    piece,
    origPos: position,
    pos: position,
    started: true,
    element: () => pieceElementByKey(s, key2),
    originTarget: e.target,
    newPiece: true,
    force: !!force,
    keyHasChanged: false
  };
  processDrag(s);
}
function processDrag(s) {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur)
      return;
    if (s.animation.current?.plan.anims.has(cur.orig))
      s.animation.current = void 0;
    const origPiece = s.pieces.get(cur.orig);
    if (!origPiece || !samePiece(origPiece, cur.piece))
      cancel2(s);
    else {
      if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
        cur.started = true;
      if (cur.started) {
        if (typeof cur.element === "function") {
          const found = cur.element();
          if (!found)
            return;
          found.cgDragging = true;
          found.classList.add("dragging");
          cur.element = found;
        }
        const bounds = s.dom.bounds();
        translate(cur.element, [
          cur.pos[0] - bounds.left - bounds.width / 16,
          cur.pos[1] - bounds.top - bounds.height / 16
        ]);
        if (s.jsHover)
          handleJsHover(s, cur);
        else
          cur.keyHasChanged || (cur.keyHasChanged = cur.orig !== getKeyAtDomPos(cur.pos, whitePov(s), bounds));
      }
    }
    processDrag(s);
  });
}
function handleJsHover(s, cur) {
  const hoveredKey = getKeyAtDomPos(cur.pos, whitePov(s), s.dom.bounds());
  if (cur.orig !== hoveredKey) {
    cur.keyHasChanged = true;
    if (hoveredKey) {
      const isValidMove = s.movable.dests?.get(cur.orig)?.includes(hoveredKey) ?? s.premovable.dests?.includes(hoveredKey);
      if (isValidMove) {
        const hoveredValidDestSquare = s.dom.elements.board.querySelector(`.move-dest[data-key="${hoveredKey}"], .premove-dest[data-key="${hoveredKey}"]`);
        if (hoveredValidDestSquare && !hoveredValidDestSquare.classList.contains("hover")) {
          resetHoverState(s);
          hoveredValidDestSquare.classList.add("hover");
        }
      } else {
        resetHoverState(s);
      }
    }
  } else {
    resetHoverState(s);
  }
}
function resetHoverState(s) {
  const squares = s.dom.elements.board.querySelectorAll(`.move-dest, .premove-dest`);
  if (squares.length > 0) {
    squares.forEach((sq) => sq.classList.remove("hover"));
  }
}
function move2(s, e) {
  if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
    s.draggable.current.pos = eventPosition(e);
  }
}
function end2(s, e) {
  const cur = s.draggable.current;
  if (!cur)
    return;
  if (e.type === "touchend" && e.cancelable !== false)
    e.preventDefault();
  if (e.type === "touchend" && cur.originTarget !== e.target && !cur.newPiece) {
    s.draggable.current = void 0;
    return;
  }
  unsetPremove(s);
  unsetPredrop(s);
  const eventPos = eventPosition(e) || cur.pos;
  const dest = getKeyAtDomPos(eventPos, whitePov(s), s.dom.bounds());
  if (dest && cur.started && cur.orig !== dest) {
    if (cur.newPiece)
      dropNewPiece(s, cur.orig, dest, cur.force);
    else {
      s.stats.ctrlKey = e.ctrlKey;
      if (userMove(s, cur.orig, dest))
        s.stats.dragged = true;
    }
  } else if (cur.newPiece) {
    s.pieces.delete(cur.orig);
  } else if (s.draggable.deleteOnDropOff && !dest) {
    s.pieces.delete(cur.orig);
    callUserFunction(s.events.change);
  }
  if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
    unselect(s);
  else if (!s.selectable.enabled)
    unselect(s);
  removeDragElements(s);
  s.draggable.current = void 0;
  s.dom.redraw();
}
function cancel2(s) {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece)
      s.pieces.delete(cur.orig);
    s.draggable.current = void 0;
    unselect(s);
    removeDragElements(s);
    s.dom.redraw();
  }
}
function removeDragElements(s) {
  const e = s.dom.elements;
  if (e.ghost)
    setVisible(e.ghost, false);
}
function pieceElementByKey(s, key2) {
  let el = s.dom.elements.board.firstChild;
  while (el) {
    if (el.cgKey === key2 && el.tagName === "PIECE")
      return el;
    el = el.nextSibling;
  }
  return void 0;
}

// node_modules/@lichess-org/chessground/dist/explosion.js
function explosion(state, keys) {
  state.exploding = { stage: 1, keys };
  state.dom.redraw();
  setTimeout(() => {
    setStage(state, 2);
    setTimeout(() => setStage(state, void 0), 120);
  }, 120);
}
function setStage(state, stage) {
  if (state.exploding) {
    if (stage)
      state.exploding.stage = stage;
    else
      state.exploding = void 0;
    state.dom.redraw();
  }
}

// node_modules/@lichess-org/chessground/dist/api.js
function start3(state, redrawAll) {
  function toggleOrientation2() {
    toggleOrientation(state);
    redrawAll();
  }
  return {
    set(config) {
      if (config.orientation && config.orientation !== state.orientation)
        toggleOrientation2();
      applyAnimation(state, config);
      (config.fen ? anim : render)((state2) => configure(state2, config), state);
    },
    state,
    getFen: () => write(state.pieces),
    toggleOrientation: toggleOrientation2,
    setPieces(pieces) {
      anim((state2) => setPieces(state2, pieces), state);
    },
    selectSquare(key2, force) {
      if (key2)
        anim((state2) => selectSquare(state2, key2, force), state);
      else if (state.selected) {
        unselect(state);
        state.dom.redraw();
      }
    },
    move(orig, dest) {
      anim((state2) => baseMove(state2, orig, dest), state);
    },
    newPiece(piece, key2) {
      anim((state2) => baseNewPiece(state2, piece, key2), state);
    },
    playPremove() {
      if (state.premovable.current) {
        if (anim(playPremove, state))
          return true;
        state.dom.redraw();
      }
      return false;
    },
    playPredrop(validate) {
      if (state.predroppable.current) {
        const result = playPredrop(state, validate);
        state.dom.redraw();
        return result;
      }
      return false;
    },
    cancelPremove() {
      render(unsetPremove, state);
    },
    cancelPredrop() {
      render(unsetPredrop, state);
    },
    cancelMove() {
      render((state2) => {
        cancelMove(state2);
        cancel2(state2);
      }, state);
    },
    stop() {
      render((state2) => {
        stop(state2);
        cancel2(state2);
      }, state);
    },
    explode(keys) {
      explosion(state, keys);
    },
    setAutoShapes(shapes) {
      render((state2) => state2.drawable.autoShapes = shapes, state);
    },
    setShapes(shapes) {
      render((state2) => state2.drawable.shapes = shapes.slice(), state);
    },
    getKeyAtDomPos(pos) {
      return getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
    },
    redrawAll,
    dragNewPiece(piece, event, force) {
      dragNewPiece(state, piece, event, force);
    },
    destroy() {
      stop(state);
      state.dom.unbind?.();
      state.dom.destroyed = true;
    }
  };
}

// node_modules/@lichess-org/chessground/dist/sync.js
function syncShapes(shapes, root, renderShape3) {
  const hashesInDom = /* @__PURE__ */ new Map(), toRemove = [];
  for (const sc of shapes)
    hashesInDom.set(sc.hash, false);
  let el = root.firstElementChild, elHash;
  while (el) {
    elHash = el.getAttribute("cgHash");
    if (hashesInDom.has(elHash))
      hashesInDom.set(elHash, true);
    else
      toRemove.push(el);
    el = el.nextElementSibling;
  }
  for (const el2 of toRemove)
    root.removeChild(el2);
  for (const sc of shapes) {
    if (!hashesInDom.get(sc.hash))
      root.appendChild(renderShape3(sc));
  }
}

// node_modules/@lichess-org/chessground/dist/autoPieces.js
function render2(state, autoPieceEl) {
  const autoPieces = state.drawable.autoShapes.filter((autoShape) => autoShape.piece);
  const autoPieceShapes = autoPieces.map((s) => {
    return {
      shape: s,
      hash: hash(s),
      current: false,
      pendingErase: false
    };
  });
  syncShapes(autoPieceShapes, autoPieceEl, (shape) => renderShape(state, shape, state.dom.bounds()));
}
function renderResized(state) {
  const asWhite = whitePov(state), posToTranslate2 = posToTranslate(state.dom.bounds());
  let el = state.dom.elements.autoPieces?.firstChild;
  while (el) {
    translateAndScale(el, posToTranslate2(key2pos(el.cgKey), asWhite), el.cgScale);
    el = el.nextSibling;
  }
}
function renderShape(state, { shape, hash: hash2 }, bounds) {
  const orig = shape.orig;
  const role = shape.piece?.role;
  const color = shape.piece?.color;
  const scale = shape.piece?.scale;
  const pieceEl = createEl("piece", `${role} ${color}`);
  pieceEl.setAttribute("cgHash", hash2);
  pieceEl.cgKey = orig;
  pieceEl.cgScale = scale;
  translateAndScale(pieceEl, posToTranslate(bounds)(key2pos(orig), whitePov(state)), scale);
  return pieceEl;
}
var hash = (autoPiece) => [autoPiece.orig, autoPiece.piece?.role, autoPiece.piece?.color, autoPiece.piece?.scale].join(",");

// node_modules/@lichess-org/chessground/dist/drop.js
function drop(s, e) {
  if (!s.dropmode.active)
    return;
  unsetPremove(s);
  unsetPredrop(s);
  const piece = s.dropmode.piece;
  if (piece) {
    s.pieces.set("a0", piece);
    const position = eventPosition(e);
    const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds());
    if (dest)
      dropNewPiece(s, "a0", dest);
  }
  s.dom.redraw();
}

// node_modules/@lichess-org/chessground/dist/events.js
function bindBoard(s) {
  const boardEl = s.dom.elements.board;
  if (s.disableContextMenu || s.drawable.enabled) {
    boardEl.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  if (s.viewOnly)
    return;
  const onStart = startDragOrDraw(s);
  boardEl.addEventListener("touchstart", onStart, {
    passive: false
  });
  boardEl.addEventListener("mousedown", onStart, {
    passive: false
  });
}
function bindDocument(s, onResize) {
  const unbinds = [];
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(onResize);
    ro.observe(s.dom.elements.wrap);
    unbinds.push(() => ro.disconnect());
  } else
    unbinds.push(unbindable(document.body, "chessground.resize", onResize));
  if (!s.viewOnly) {
    const onmove = dragOrDraw(s, move2, move);
    const onend = dragOrDraw(s, end2, end);
    for (const ev of ["touchmove", "mousemove"])
      unbinds.push(unbindable(document, ev, onmove));
    for (const ev of ["touchend", "mouseup"])
      unbinds.push(unbindable(document, ev, onend));
    const onScroll = () => s.dom.bounds.clear();
    unbinds.push(unbindable(document, "scroll", onScroll, { capture: true, passive: true }));
    unbinds.push(unbindable(window, "resize", onScroll, { passive: true }));
  }
  return () => unbinds.forEach((f) => f());
}
function unbindable(el, eventName, callback, options) {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}
var startDragOrDraw = (s) => (e) => {
  if (s.draggable.current)
    cancel2(s);
  else if (s.drawable.current)
    cancel(s);
  else if (e.shiftKey || isRightButton(e)) {
    if (s.drawable.enabled)
      start(s, e);
  } else if (!s.viewOnly) {
    if (s.dropmode.active)
      drop(s, e);
    else
      start2(s, e);
  }
};
var dragOrDraw = (s, withDrag, withDraw) => (e) => {
  if (s.drawable.current) {
    if (s.drawable.enabled)
      withDraw(s, e);
  } else if (!s.viewOnly)
    withDrag(s, e);
};

// node_modules/@lichess-org/chessground/dist/render.js
function render3(s) {
  const asWhite = whitePov(s), posToTranslate2 = posToTranslate(s.dom.bounds()), boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : /* @__PURE__ */ new Map(), fadings = curAnim ? curAnim.plan.fadings : /* @__PURE__ */ new Map(), curDrag = s.draggable.current, samePieces = /* @__PURE__ */ new Set(), movedPieces = /* @__PURE__ */ new Map(), desiredSquares = computeSquareClasses(s), availableSquares = /* @__PURE__ */ new Map();
  let k, el, pieceAtKey, elPieceName, anim2, fading, pMvdset, pMvd, sAvail;
  el = boardEl.firstChild;
  while (el) {
    k = el.cgKey;
    if (isPieceNode(el)) {
      pieceAtKey = pieces.get(k);
      anim2 = anims.get(k);
      fading = fadings.get(k);
      elPieceName = el.cgPiece;
      if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
        el.classList.remove("dragging");
        translate(el, posToTranslate2(key2pos(k), asWhite));
        el.cgDragging = false;
      }
      if (!fading && el.cgFading) {
        el.cgFading = false;
        el.classList.remove("fading");
      }
      if (pieceAtKey) {
        if (anim2 && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
          const pos = key2pos(k);
          pos[0] += anim2[2];
          pos[1] += anim2[3];
          el.classList.add("anim");
          translate(el, posToTranslate2(pos, asWhite));
        } else if (el.cgAnimating) {
          el.cgAnimating = false;
          el.classList.remove("anim");
          translate(el, posToTranslate2(key2pos(k), asWhite));
          if (s.addPieceZIndex)
            el.style.zIndex = posZIndex(key2pos(k), asWhite);
        }
        if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading))
          samePieces.add(k);
        else if (fading && elPieceName === pieceNameOf(fading)) {
          el.classList.add("fading");
          el.cgFading = true;
        } else
          appendValue(movedPieces, elPieceName, el);
      } else
        appendValue(movedPieces, elPieceName, el);
    } else if (isSquareNode(el)) {
      const cls = el.className;
      if (desiredSquares.get(k) === cls) {
        setVisible(el, true);
        desiredSquares.delete(k);
      } else
        appendValue(availableSquares, cls, el);
    }
    el = el.nextSibling;
  }
  for (const [sk, className] of desiredSquares) {
    sAvail = availableSquares.get(className)?.pop();
    const translation = posToTranslate2(key2pos(sk), asWhite);
    if (sAvail) {
      sAvail.cgKey = sk;
      if (s.jsHover)
        sAvail.dataset["key"] = sk;
      translate(sAvail, translation);
      setVisible(sAvail, true);
    } else {
      const squareNode = createEl("square", className);
      squareNode.cgKey = sk;
      if (s.jsHover)
        squareNode.dataset["key"] = sk;
      translate(squareNode, translation);
      boardEl.insertBefore(squareNode, boardEl.firstChild);
    }
  }
  for (const [, nodes] of availableSquares.entries()) {
    for (const node2 of nodes)
      setVisible(node2, false);
  }
  for (const [k2, p] of pieces) {
    anim2 = anims.get(k2);
    if (!samePieces.has(k2)) {
      pMvdset = movedPieces.get(pieceNameOf(p));
      pMvd = pMvdset && pMvdset.pop();
      if (pMvd) {
        pMvd.cgKey = k2;
        if (pMvd.cgFading) {
          pMvd.classList.remove("fading");
          pMvd.cgFading = false;
        }
        const pos = key2pos(k2);
        if (s.addPieceZIndex)
          pMvd.style.zIndex = posZIndex(pos, asWhite);
        if (anim2) {
          pMvd.cgAnimating = true;
          pMvd.classList.add("anim");
          pos[0] += anim2[2];
          pos[1] += anim2[3];
        }
        translate(pMvd, posToTranslate2(pos, asWhite));
      } else {
        const pieceName = pieceNameOf(p), pieceNode = createEl("piece", pieceName), pos = key2pos(k2);
        pieceNode.cgPiece = pieceName;
        pieceNode.cgKey = k2;
        if (anim2) {
          pieceNode.cgAnimating = true;
          pos[0] += anim2[2];
          pos[1] += anim2[3];
        }
        translate(pieceNode, posToTranslate2(pos, asWhite));
        if (s.addPieceZIndex)
          pieceNode.style.zIndex = posZIndex(pos, asWhite);
        boardEl.appendChild(pieceNode);
      }
    }
  }
  for (const nodes of movedPieces.values())
    removeNodes(s, nodes);
}
function renderResized2(s) {
  const asWhite = whitePov(s), posToTranslate2 = posToTranslate(s.dom.bounds());
  let el = s.dom.elements.board.firstChild;
  while (el) {
    if (isPieceNode(el) && !el.cgAnimating || isSquareNode(el)) {
      translate(el, posToTranslate2(key2pos(el.cgKey), asWhite));
    }
    el = el.nextSibling;
  }
}
function updateBounds(s) {
  const bounds = s.dom.elements.wrap.getBoundingClientRect();
  const container = s.dom.elements.container;
  const ratio = bounds.height / bounds.width;
  const width = Math.floor(bounds.width * window.devicePixelRatio / 8) * 8 / window.devicePixelRatio;
  const height = width * ratio;
  container.style.width = width + "px";
  container.style.height = height + "px";
  s.dom.bounds.clear();
  s.addDimensionsCssVarsTo?.style.setProperty("---cg-width", width + "px");
  s.addDimensionsCssVarsTo?.style.setProperty("---cg-height", height + "px");
}
var isPieceNode = (el) => el.tagName === "PIECE";
var isSquareNode = (el) => el.tagName === "SQUARE";
function removeNodes(s, nodes) {
  for (const node2 of nodes)
    s.dom.elements.board.removeChild(node2);
}
function posZIndex(pos, asWhite) {
  const minZ = 3;
  const rank2 = pos[1];
  const z = asWhite ? minZ + 7 - rank2 : minZ + rank2;
  return `${z}`;
}
var pieceNameOf = (piece) => `${piece.color} ${piece.role}`;
var normalizeLastMoveStandardRookCastle = (s, k) => !!s.lastMove?.[1] && !s.pieces.has(s.lastMove[1]) && s.lastMove[0][0] === "e" && ["h", "a"].includes(s.lastMove[1][0]) && s.lastMove[0][1] === s.lastMove[1][1] && squaresBetween(...key2pos(s.lastMove[0]), ...key2pos(s.lastMove[1])).some((sq) => s.pieces.has(sq)) ? (k > s.lastMove[0] ? "g" : "c") + k[1] : k;
function computeSquareClasses(s) {
  const squares = /* @__PURE__ */ new Map();
  if (s.lastMove && s.highlight.lastMove)
    for (const [i, k] of s.lastMove.entries())
      addSquare(squares, i === 1 ? normalizeLastMoveStandardRookCastle(s, k) : k, "last-move");
  if (s.check && s.highlight.check)
    addSquare(squares, s.check, "check");
  if (s.selected) {
    addSquare(squares, s.selected, "selected");
    if (s.movable.showDests) {
      for (const k of s.movable.dests?.get(s.selected) ?? [])
        addSquare(squares, k, "move-dest" + (s.pieces.has(k) ? " oc" : ""));
      for (const k of s.premovable.customDests?.get(s.selected) ?? s.premovable.dests ?? [])
        addSquare(squares, k, "premove-dest" + (s.pieces.has(k) ? " oc" : ""));
    }
  }
  const premove2 = s.premovable.current;
  if (premove2)
    for (const k of premove2)
      addSquare(squares, k, "current-premove");
  else if (s.predroppable.current)
    addSquare(squares, s.predroppable.current.key, "current-premove");
  const o = s.exploding;
  if (o)
    for (const k of o.keys)
      addSquare(squares, k, "exploding" + o.stage);
  if (s.highlight.custom) {
    s.highlight.custom.forEach((v, k) => {
      addSquare(squares, k, v);
    });
  }
  return squares;
}
function addSquare(squares, key2, klass) {
  const classes = squares.get(key2);
  if (classes)
    squares.set(key2, `${classes} ${klass}`);
  else
    squares.set(key2, klass);
}
function appendValue(map, key2, value2) {
  const arr = map.get(key2);
  if (arr)
    arr.push(value2);
  else
    map.set(key2, [value2]);
}

// node_modules/@lichess-org/chessground/dist/state.js
function defaults() {
  return {
    pieces: read(initial),
    orientation: "white",
    turnColor: "white",
    coordinates: true,
    coordinatesOnSquares: false,
    ranksPosition: "right",
    autoCastle: true,
    viewOnly: false,
    disableContextMenu: false,
    addPieceZIndex: false,
    blockTouchScroll: false,
    touchIgnoreRadius: 1,
    pieceKey: false,
    trustAllEvents: false,
    jsHover: false,
    highlight: {
      lastMove: true,
      check: true
    },
    animation: {
      enabled: true,
      duration: 200
    },
    movable: {
      free: true,
      color: "both",
      showDests: true,
      events: {},
      rookCastle: true
    },
    premovable: {
      enabled: true,
      showDests: true,
      castle: true,
      additionalPremoveRequirements: (_) => true,
      events: {}
    },
    predroppable: {
      enabled: false,
      events: {}
    },
    draggable: {
      enabled: true,
      distance: 3,
      autoDistance: true,
      showGhost: true,
      deleteOnDropOff: false
    },
    dropmode: {
      active: false
    },
    selectable: {
      enabled: true
    },
    stats: {
      // on touchscreen, default to "tap-tap" moves
      // instead of drag
      dragged: !("ontouchstart" in window)
    },
    events: {},
    drawable: {
      enabled: true,
      // can draw
      visible: true,
      // can view
      defaultSnapToValidMove: true,
      eraseOnMovablePieceClick: true,
      shapes: [],
      autoShapes: [],
      brushes: {
        green: { key: "g", color: "#15781B", opacity: 1, lineWidth: 10 },
        red: { key: "r", color: "#882020", opacity: 1, lineWidth: 10 },
        blue: { key: "b", color: "#003088", opacity: 1, lineWidth: 10 },
        yellow: { key: "y", color: "#e68f00", opacity: 1, lineWidth: 10 },
        paleBlue: { key: "pb", color: "#003088", opacity: 0.4, lineWidth: 15 },
        paleGreen: { key: "pg", color: "#15781B", opacity: 0.4, lineWidth: 15 },
        paleRed: { key: "pr", color: "#882020", opacity: 0.4, lineWidth: 15 },
        paleGrey: {
          key: "pgr",
          color: "#4a4a4a",
          opacity: 0.35,
          lineWidth: 15
        },
        purple: { key: "purple", color: "#68217a", opacity: 0.65, lineWidth: 10 },
        pink: { key: "pink", color: "#ee2080", opacity: 0.5, lineWidth: 10 },
        white: { key: "white", color: "white", opacity: 1, lineWidth: 10 },
        paleWhite: { key: "pwhite", color: "white", opacity: 0.6, lineWidth: 10 },
        variation: { key: "variation", color: "white", opacity: 0.5, lineWidth: 12 }
      },
      prevSvgHash: ""
    },
    hold: timer()
  };
}

// node_modules/@lichess-org/chessground/dist/svg.js
function createDefs() {
  const defs = createElement("defs");
  const filter = setAttributes(createElement("filter"), { id: "cg-filter-blur" });
  filter.appendChild(setAttributes(createElement("feGaussianBlur"), { stdDeviation: "0.013" }));
  defs.appendChild(filter);
  return defs;
}
function renderSvg(state, els) {
  const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : void 0, dests = /* @__PURE__ */ new Map(), bounds = state.dom.bounds(), nonPieceAutoShapes = d.autoShapes.filter((autoShape) => !autoShape.piece);
  for (const s of d.shapes.concat(nonPieceAutoShapes).concat(cur ? [cur] : [])) {
    if (!s.dest)
      continue;
    const sources = dests.get(s.dest) ?? /* @__PURE__ */ new Set(), from = pos2user(orient(key2pos(s.orig), state.orientation), bounds), to = pos2user(orient(key2pos(s.dest), state.orientation), bounds);
    sources.add(angleToSlot(moveAngle(from, to)));
    dests.set(s.dest, sources);
  }
  const shapes = [];
  const pendingEraseIdx = cur ? d.shapes.findIndex((s) => sameEndpoints(s, cur) && sameColor(s, cur)) : -1;
  for (const [idx, s] of d.shapes.concat(nonPieceAutoShapes).entries()) {
    const isPendingErase = pendingEraseIdx !== -1 && pendingEraseIdx === idx;
    shapes.push({
      shape: s,
      current: false,
      pendingErase: isPendingErase,
      hash: shapeHash(s, isShort(s.dest, dests), false, bounds, isPendingErase, angleCount(s.dest, dests))
    });
  }
  if (cur && pendingEraseIdx === -1)
    shapes.push({
      shape: cur,
      current: true,
      hash: shapeHash(cur, isShort(cur.dest, dests), true, bounds, false, angleCount(cur.dest, dests)),
      pendingErase: false
    });
  const fullHash = shapes.map((sc) => sc.hash).join(";");
  if (fullHash === state.drawable.prevSvgHash)
    return;
  state.drawable.prevSvgHash = fullHash;
  syncDefs(d, shapes, els);
  syncShapes2(shapes, els, (s) => renderShape2(state, s, d.brushes, dests, bounds));
}
function syncDefs(d, shapes, els) {
  for (const shapesEl of [els.shapes, els.shapesBelow]) {
    const defsEl = shapesEl.querySelector("defs");
    const thisPlane = shapes.filter((s) => shapesEl === els.shapesBelow === !!s.shape.below);
    const brushes2 = /* @__PURE__ */ new Map();
    for (const s of thisPlane.filter((s2) => s2.shape.dest && s2.shape.brush)) {
      const brush = makeCustomBrush(d.brushes[s.shape.brush], s.shape.modifiers);
      const { key: key2, color } = hiliteOf(s.shape);
      if (key2 && color)
        brushes2.set(key2, { key: key2, color, opacity: 1, lineWidth: 1 });
      brushes2.set(brush.key, brush);
    }
    const keysInDom = /* @__PURE__ */ new Set();
    let el = defsEl.firstElementChild;
    while (el) {
      keysInDom.add(el.getAttribute("cgKey"));
      el = el.nextElementSibling;
    }
    for (const [key2, brush] of brushes2.entries()) {
      if (!keysInDom.has(key2))
        defsEl.appendChild(renderMarker(brush));
    }
  }
}
function syncShapes2(shapes, els, renderShape3) {
  for (const [shapesEl, customEl] of [
    [els.shapes, els.custom],
    [els.shapesBelow, els.customBelow]
  ]) {
    const [shapesG, customG] = [shapesEl, customEl].map((el) => el.querySelector("g"));
    const thisPlane = shapes.filter((s) => shapesEl === els.shapesBelow === !!s.shape.below);
    const hashesInDom = /* @__PURE__ */ new Map();
    for (const sc of thisPlane)
      hashesInDom.set(sc.hash, false);
    for (const root of [shapesG, customG]) {
      const toRemove = [];
      let el = root.firstElementChild, elHash;
      while (el) {
        elHash = el.getAttribute("cgHash");
        if (hashesInDom.has(elHash))
          hashesInDom.set(elHash, true);
        else
          toRemove.push(el);
        el = el.nextElementSibling;
      }
      for (const el2 of toRemove)
        root.removeChild(el2);
    }
    for (const sc of thisPlane.filter((s) => !hashesInDom.get(s.hash))) {
      for (const svg of renderShape3(sc)) {
        if (svg.isCustom)
          customG.appendChild(svg.el);
        else
          shapesG.appendChild(svg.el);
      }
    }
  }
}
function shapeHash({ orig, dest, brush, piece, modifiers, customSvg, label, below }, shorten, current, bounds, pendingErase, angleCountOfDest) {
  return [
    bounds.width,
    bounds.height,
    current,
    pendingErase && "pendingErase",
    angleCountOfDest,
    orig,
    dest,
    brush,
    shorten && "-",
    piece && pieceHash(piece),
    modifiers && modifiersHash(modifiers),
    customSvg && `custom-${textHash(customSvg.html)},${customSvg.center?.[0] ?? "o"}`,
    label && `label-${textHash(label.text)}`,
    below && "below"
  ].filter(Boolean).join(",");
}
var pieceHash = (piece) => [piece.color, piece.role, piece.scale].filter(Boolean).join(",");
var modifiersHash = (m) => [m.lineWidth, m.hilite].filter(Boolean).join(",");
function textHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i) >>> 0;
  }
  return h.toString();
}
function renderShape2(state, { shape, current, pendingErase, hash: hash2 }, brushes2, dests, bounds) {
  const from = pos2user(orient(key2pos(shape.orig), state.orientation), bounds), to = shape.dest ? pos2user(orient(key2pos(shape.dest), state.orientation), bounds) : from, brush = shape.brush && makeCustomBrush(brushes2[shape.brush], shape.modifiers), slots = dests.get(shape.dest), svgs = [];
  if (brush) {
    const el = setAttributes(createElement("g"), { cgHash: hash2 });
    svgs.push({ el });
    if (from[0] !== to[0] || from[1] !== to[1])
      el.appendChild(renderArrow(shape, brush, from, to, current, isShort(shape.dest, dests), pendingErase));
    else
      el.appendChild(renderCircle(brushes2[shape.brush], from, current, bounds, pendingErase, shape.modifiers?.hilite));
  }
  if (shape.label) {
    const label = shape.label;
    label.fill ?? (label.fill = shape.brush && brushes2[shape.brush].color);
    const corner = shape.brush ? void 0 : "tr";
    svgs.push({ el: renderLabel(label, hash2, from, to, slots, corner), isCustom: true });
  }
  if (shape.customSvg) {
    const on = shape.customSvg.center ?? "orig";
    const [x, y] = on === "label" ? labelCoords(from, to, slots).map((c) => c - 0.5) : on === "dest" ? to : from;
    const el = setAttributes(createElement("g"), { transform: `translate(${x},${y})`, cgHash: hash2 });
    el.innerHTML = `<svg width="1" height="1" viewBox="0 0 100 100">${shape.customSvg.html}</svg>`;
    svgs.push({ el, isCustom: true });
  }
  return svgs;
}
function renderCircle(brush, at, current, bounds, pendingErase, hiliteColor) {
  const widths = circleWidth(), radius = (bounds.width + bounds.height) / (4 * Math.max(bounds.width, bounds.height));
  function renderOneCircle(isHilite) {
    return setAttributes(createElement("circle"), {
      stroke: isHilite ? hiliteColor : brush.color,
      "stroke-width": widths[current ? 0 : 1] * (isHilite ? 2 : 1),
      fill: "none",
      opacity: hiliteColor && !pendingErase ? 1 : opacity(brush, current, pendingErase),
      cx: at[0],
      cy: at[1],
      r: radius - widths[1] / 2
    });
  }
  if (!hiliteColor)
    return renderOneCircle(false);
  const g = setAttributes(createElement("g"), { opacity: brush.opacity });
  const blurred = setAttributes(createElement("g"), { filter: "url(#cg-filter-blur)" });
  blurred.appendChild(renderOneCircle(true));
  g.appendChild(blurred);
  g.appendChild(renderOneCircle(false));
  return g;
}
function renderArrow(s, brush, from, to, current, shorten, pendingErase) {
  function renderLine(isHilite) {
    const m = arrowMargin(shorten && !current), dx = to[0] - from[0], dy = to[1] - from[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
    const hilite = hiliteOf(s);
    return setAttributes(createElement("line"), {
      stroke: isHilite ? hilite.color : brush.color,
      "stroke-width": lineWidth(brush, current) * (isHilite ? 1.14 : 1),
      "stroke-linecap": "round",
      "marker-end": `url(#arrowhead-${isHilite ? hilite.key : brush.key})`,
      opacity: s.modifiers?.hilite && !pendingErase ? 1 : opacity(brush, current, pendingErase),
      x1: from[0],
      y1: from[1],
      x2: to[0] - xo,
      y2: to[1] - yo
    });
  }
  if (!s.modifiers?.hilite)
    return renderLine(false);
  const g = setAttributes(createElement("g"), { opacity: brush.opacity });
  const blurred = setAttributes(createElement("g"), { filter: "url(#cg-filter-blur)" });
  blurred.appendChild(filterBox(from, to));
  blurred.appendChild(renderLine(true));
  g.appendChild(blurred);
  g.appendChild(renderLine(false));
  return g;
}
function renderMarker(brush) {
  const marker = setAttributes(createElement("marker"), {
    id: "arrowhead-" + brush.key,
    orient: "auto",
    overflow: "visible",
    markerWidth: 4,
    markerHeight: 4,
    refX: brush.key.startsWith("hilite") ? 1.86 : 2.05,
    refY: 2
  });
  marker.appendChild(setAttributes(createElement("path"), {
    d: "M0,0 V4 L3,2 Z",
    fill: brush.color
  }));
  marker.setAttribute("cgKey", brush.key);
  return marker;
}
function renderLabel(label, hash2, from, to, slots, corner) {
  const labelSize = 0.4, fontSize = labelSize * 0.75 ** label.text.length, at = labelCoords(from, to, slots), cornerOff = corner === "tr" ? 0.4 : 0, g = setAttributes(createElement("g"), {
    transform: `translate(${at[0] + cornerOff},${at[1] - cornerOff})`,
    cgHash: hash2
  });
  g.appendChild(setAttributes(createElement("circle"), {
    r: labelSize / 2,
    "fill-opacity": corner ? 1 : 0.8,
    "stroke-opacity": corner ? 1 : 0.7,
    "stroke-width": 0.03,
    fill: label.fill ?? "#666",
    stroke: "white"
  }));
  const labelEl = setAttributes(createElement("text"), {
    "font-size": fontSize,
    "font-family": "Noto Sans",
    "text-anchor": "middle",
    fill: "white",
    y: 0.13 * 0.75 ** label.text.length
  });
  labelEl.innerHTML = label.text;
  g.appendChild(labelEl);
  return g;
}
var orient = (pos, color) => color === "white" ? pos : [7 - pos[0], 7 - pos[1]];
var mod = (n, m) => (n % m + m) % m;
var rotateAngleSlot = (slot, steps) => mod(slot + steps, 16);
var anyTwoCloserThan90Degrees = (slots) => [...slots].some((slot) => [-3, -2, -1, 1, 2, 3].some((i) => slots.has(rotateAngleSlot(slot, i))));
var isShort = (dest, dests) => !!dest && dests.has(dest) && anyTwoCloserThan90Degrees(dests.get(dest));
var createElement = (tagName) => document.createElementNS("http://www.w3.org/2000/svg", tagName);
var angleCount = (dest, dests) => dest && dests.has(dest) ? dests.get(dest).size : 0;
function setAttributes(el, attrs) {
  for (const key2 in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key2))
      el.setAttribute(key2, attrs[key2]);
  }
  return el;
}
var makeCustomBrush = (base, modifiers) => !modifiers ? base : {
  color: base.color,
  opacity: Math.round(base.opacity * 10) / 10,
  lineWidth: Math.round(modifiers.lineWidth || base.lineWidth),
  key: [base.key, modifiers.lineWidth].filter(Boolean).join("")
};
var circleWidth = () => [3 / 64, 4 / 64];
var lineWidth = (brush, current) => (brush.lineWidth || 10) * (current ? 0.85 : 1) / 64;
function hiliteOf(shape) {
  const hilite = shape.modifiers?.hilite;
  return { key: hilite && `hilite-${hilite.replace("#", "")}`, color: hilite };
}
var opacity = (brush, current, pendingErase) => (brush.opacity || 1) * (pendingErase ? 0.6 : current ? 0.9 : 1);
var arrowMargin = (shorten) => (shorten ? 20 : 10) / 64;
function pos2user(pos, bounds) {
  const xScale = Math.min(1, bounds.width / bounds.height);
  const yScale = Math.min(1, bounds.height / bounds.width);
  return [(pos[0] - 3.5) * xScale, (3.5 - pos[1]) * yScale];
}
function filterBox(from, to) {
  const box = {
    from: [Math.floor(Math.min(from[0], to[0])), Math.floor(Math.min(from[1], to[1]))],
    to: [Math.ceil(Math.max(from[0], to[0])), Math.ceil(Math.max(from[1], to[1]))]
  };
  return setAttributes(createElement("rect"), {
    x: box.from[0],
    y: box.from[1],
    width: box.to[0] - box.from[0],
    height: box.to[1] - box.from[1],
    fill: "none",
    stroke: "none"
  });
}
var angleToSlot = (angle) => mod(Math.round(angle * 8 / Math.PI), 16);
var moveAngle = (from, to) => Math.atan2(to[1] - from[1], to[0] - from[0]) + Math.PI;
var dist = (from, to) => Math.sqrt([from[0] - to[0], from[1] - to[1]].reduce((acc, x) => acc + x * x, 0));
function labelCoords(from, to, slots) {
  let mag = dist(from, to);
  const angle = moveAngle(from, to);
  if (slots) {
    mag -= 33 / 64;
    if (anyTwoCloserThan90Degrees(slots)) {
      mag -= 10 / 64;
      const slot = angleToSlot(angle);
      if (slot & 1 && [-1, 1].some((s) => slots.has(rotateAngleSlot(slot, s))))
        mag -= 0.4;
    }
  }
  return [from[0] - Math.cos(angle) * mag, from[1] - Math.sin(angle) * mag].map((c) => c + 0.5);
}

// node_modules/@lichess-org/chessground/dist/wrap.js
function renderWrap(element, s) {
  element.innerHTML = "";
  element.classList.add("cg-wrap");
  for (const c of colors)
    element.classList.toggle("orientation-" + c, s.orientation === c);
  element.classList.toggle("manipulable", !s.viewOnly);
  const container = createEl("cg-container");
  element.appendChild(container);
  const board2 = createEl("cg-board");
  container.appendChild(board2);
  let shapesBelow;
  let shapes;
  let customBelow;
  let custom;
  let autoPieces;
  if (s.drawable.visible) {
    [shapesBelow, shapes] = ["cg-shapes-below", "cg-shapes"].map((cls) => svgContainer(cls, true));
    [customBelow, custom] = ["cg-custom-below", "cg-custom-svgs"].map((cls) => svgContainer(cls, false));
    autoPieces = createEl("cg-auto-pieces");
    container.appendChild(shapesBelow);
    container.appendChild(customBelow);
    container.appendChild(shapes);
    container.appendChild(custom);
    container.appendChild(autoPieces);
  }
  if (s.coordinates) {
    const orientClass = s.orientation === "black" ? " black" : "";
    const ranksPositionClass = s.ranksPosition === "left" ? " left" : "";
    if (s.coordinatesOnSquares) {
      const rankN = s.orientation === "white" ? (i) => i + 1 : (i) => 8 - i;
      files.forEach((f, i) => container.appendChild(renderCoords(ranks.map((r) => f + r), "squares rank" + rankN(i) + orientClass + ranksPositionClass, i % 2 === 0 ? "black" : "white")));
    } else {
      container.appendChild(renderCoords(ranks, "ranks" + orientClass + ranksPositionClass, s.ranksPosition === "right" === (s.orientation === "white") ? "white" : "black"));
      container.appendChild(renderCoords(files, "files" + orientClass, opposite(s.orientation)));
    }
  }
  let ghost;
  if (!s.viewOnly && s.draggable.enabled && s.draggable.showGhost) {
    ghost = createEl("piece", "ghost");
    setVisible(ghost, false);
    container.appendChild(ghost);
  }
  return { board: board2, container, wrap: element, ghost, shapes, shapesBelow, custom, customBelow, autoPieces };
}
function svgContainer(cls, isShapes) {
  const svg = setAttributes(createElement("svg"), {
    class: cls,
    viewBox: isShapes ? "-4 -4 8 8" : "-3.5 -3.5 8 8",
    preserveAspectRatio: "xMidYMid slice",
    style: "color-scheme:light only"
  });
  if (isShapes)
    svg.appendChild(createDefs());
  svg.appendChild(createElement("g"));
  return svg;
}
function renderCoords(elems, className, firstColor) {
  const el = createEl("coords", className);
  let f;
  elems.forEach((elem, i) => {
    const light = i % 2 === (firstColor === "white" ? 0 : 1);
    f = createEl("coord", `coord-${light ? "light" : "dark"}`);
    f.textContent = elem;
    el.appendChild(f);
  });
  return el;
}

// node_modules/@lichess-org/chessground/dist/chessground.js
function Chessground(element, config) {
  const maybeState = defaults();
  configure(maybeState, config || {});
  function redrawAll() {
    const prevUnbind = "dom" in maybeState ? maybeState.dom.unbind : void 0;
    const elements = renderWrap(element, maybeState), bounds = memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
      render3(state);
      if (elements.autoPieces)
        render2(state, elements.autoPieces);
      if (!skipSvg && elements.shapes)
        renderSvg(state, elements);
    }, onResize = () => {
      updateBounds(state);
      renderResized2(state);
      if (elements.autoPieces)
        renderResized(state);
    };
    const state = maybeState;
    state.dom = {
      elements,
      bounds,
      redraw: debounceRedraw(redrawNow),
      redrawNow,
      unbind: prevUnbind
    };
    state.drawable.prevSvgHash = "";
    updateBounds(state);
    redrawNow(false);
    bindBoard(state);
    if (!prevUnbind)
      state.dom.unbind = bindDocument(state, onResize);
    state.events.insert?.(elements);
    return state;
  }
  return start3(redrawAll(), redrawAll);
}
function debounceRedraw(redrawNow) {
  let redrawing = false;
  return () => {
    if (redrawing)
      return;
    redrawing = true;
    requestAnimationFrame(() => {
      redrawNow();
      redrawing = false;
    });
  };
}

// node_modules/chess.js/dist/esm/chess.js
function rootNode(comment) {
  return comment !== null ? { comment, variations: [] } : { variations: [] };
}
function node(move3, suffix, nag, comment, variations) {
  const node2 = { move: move3, variations };
  if (suffix) {
    node2.suffix = suffix;
  }
  if (nag) {
    node2.nag = nag;
  }
  if (comment !== null) {
    node2.comment = comment;
  }
  return node2;
}
function lineToTree(...nodes) {
  const [root, ...rest] = nodes;
  let parent = root;
  for (const child of rest) {
    if (child !== null) {
      parent.variations = [child, ...child.variations];
      child.variations = [];
      parent = child;
    }
  }
  return root;
}
function pgn(headers, game) {
  if (game.marker && game.marker.comment) {
    let node2 = game.root;
    while (true) {
      const next = node2.variations[0];
      if (!next) {
        node2.comment = game.marker.comment;
        break;
      }
      node2 = next;
    }
  }
  return {
    headers,
    root: game.root,
    result: (game.marker && game.marker.result) ?? void 0
  };
}
function peg$subclass(child, parent) {
  function C() {
    this.constructor = child;
  }
  C.prototype = parent.prototype;
  child.prototype = new C();
}
function peg$SyntaxError(message, expected, found, location2) {
  var self2 = Error.call(this, message);
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self2, peg$SyntaxError.prototype);
  }
  self2.expected = expected;
  self2.found = found;
  self2.location = location2;
  self2.name = "SyntaxError";
  return self2;
}
peg$subclass(peg$SyntaxError, Error);
function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) {
    return str;
  }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}
peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, " ");
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = last - s.column || 1;
      str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};
peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return '"' + literalEscape(expectation.text) + '"';
    },
    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
      });
      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },
    any: function() {
      return "any character";
    },
    end: function() {
      return "end of input";
    },
    other: function(expectation) {
      return expectation.description;
    }
  };
  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }
  function literalEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function classEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
      return "\\x0" + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
      return "\\x" + hex(ch);
    });
  }
  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }
  function describeExpected(expected2) {
    var descriptions = expected2.map(describeExpectation);
    var i, j;
    descriptions.sort();
    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }
    switch (descriptions.length) {
      case 1:
        return descriptions[0];
      case 2:
        return descriptions[0] + " or " + descriptions[1];
      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }
  function describeFound(found2) {
    return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
  }
  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};
function peg$parse(input, options) {
  options = options !== void 0 ? options : {};
  var peg$FAILED = {};
  var peg$source = options.grammarSource;
  var peg$startRuleFunctions = { pgn: peg$parsepgn };
  var peg$startRuleFunction = peg$parsepgn;
  var peg$c0 = "[";
  var peg$c1 = '"';
  var peg$c2 = "]";
  var peg$c3 = ".";
  var peg$c4 = "O-O-O";
  var peg$c5 = "O-O";
  var peg$c6 = "0-0-0";
  var peg$c7 = "0-0";
  var peg$c8 = "$";
  var peg$c9 = "{";
  var peg$c10 = "}";
  var peg$c11 = ";";
  var peg$c12 = "(";
  var peg$c13 = ")";
  var peg$c14 = "1-0";
  var peg$c15 = "0-1";
  var peg$c16 = "1/2-1/2";
  var peg$c17 = "*";
  var peg$r0 = /^[a-zA-Z]/;
  var peg$r1 = /^[^"]/;
  var peg$r2 = /^[0-9]/;
  var peg$r3 = /^[.]/;
  var peg$r4 = /^[a-zA-Z1-8\-=]/;
  var peg$r5 = /^[+#]/;
  var peg$r6 = /^[!?]/;
  var peg$r7 = /^[^}]/;
  var peg$r8 = /^[^\r\n]/;
  var peg$r9 = /^[ \t\r\n]/;
  var peg$e0 = peg$otherExpectation("tag pair");
  var peg$e1 = peg$literalExpectation("[", false);
  var peg$e2 = peg$literalExpectation('"', false);
  var peg$e3 = peg$literalExpectation("]", false);
  var peg$e4 = peg$otherExpectation("tag name");
  var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
  var peg$e6 = peg$otherExpectation("tag value");
  var peg$e7 = peg$classExpectation(['"'], true, false);
  var peg$e8 = peg$otherExpectation("move number");
  var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
  var peg$e10 = peg$literalExpectation(".", false);
  var peg$e11 = peg$classExpectation(["."], false, false);
  var peg$e12 = peg$otherExpectation("standard algebraic notation");
  var peg$e13 = peg$literalExpectation("O-O-O", false);
  var peg$e14 = peg$literalExpectation("O-O", false);
  var peg$e15 = peg$literalExpectation("0-0-0", false);
  var peg$e16 = peg$literalExpectation("0-0", false);
  var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
  var peg$e18 = peg$classExpectation(["+", "#"], false, false);
  var peg$e19 = peg$otherExpectation("suffix annotation");
  var peg$e20 = peg$classExpectation(["!", "?"], false, false);
  var peg$e21 = peg$otherExpectation("NAG");
  var peg$e22 = peg$literalExpectation("$", false);
  var peg$e23 = peg$otherExpectation("brace comment");
  var peg$e24 = peg$literalExpectation("{", false);
  var peg$e25 = peg$classExpectation(["}"], true, false);
  var peg$e26 = peg$literalExpectation("}", false);
  var peg$e27 = peg$otherExpectation("rest of line comment");
  var peg$e28 = peg$literalExpectation(";", false);
  var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
  var peg$e30 = peg$otherExpectation("variation");
  var peg$e31 = peg$literalExpectation("(", false);
  var peg$e32 = peg$literalExpectation(")", false);
  var peg$e33 = peg$otherExpectation("game termination marker");
  var peg$e34 = peg$literalExpectation("1-0", false);
  var peg$e35 = peg$literalExpectation("0-1", false);
  var peg$e36 = peg$literalExpectation("1/2-1/2", false);
  var peg$e37 = peg$literalExpectation("*", false);
  var peg$e38 = peg$otherExpectation("whitespace");
  var peg$e39 = peg$classExpectation([" ", "	", "\r", "\n"], false, false);
  var peg$f0 = function(headers, game) {
    return pgn(headers, game);
  };
  var peg$f1 = function(tagPairs) {
    return Object.fromEntries(tagPairs);
  };
  var peg$f2 = function(tagName, tagValue) {
    return [tagName, tagValue];
  };
  var peg$f3 = function(root, marker) {
    return { root, marker };
  };
  var peg$f4 = function(comment, moves2) {
    return lineToTree(rootNode(comment), ...moves2.flat());
  };
  var peg$f5 = function(san, suffix, nag, comment, variations) {
    return node(san, suffix, nag, comment, variations);
  };
  var peg$f6 = function(nag) {
    return nag;
  };
  var peg$f7 = function(comment) {
    return comment.replace(/[\r\n]+/g, " ");
  };
  var peg$f8 = function(comment) {
    return comment.trim();
  };
  var peg$f9 = function(line) {
    return line;
  };
  var peg$f10 = function(result, comment) {
    return { result, comment };
  };
  var peg$currPos = options.peg$currPos | 0;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;
  var peg$result;
  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
    }
    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }
  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text, ignoreCase };
  }
  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts, inverted, ignoreCase };
  }
  function peg$endExpectation() {
    return { type: "end" };
  }
  function peg$otherExpectation(description) {
    return { type: "other", description };
  }
  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;
    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {
        }
      }
      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };
      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }
        p++;
      }
      peg$posDetailsCache[pos] = details;
      return details;
    }
  }
  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);
    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    return res;
  }
  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }
    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }
    peg$maxFailExpected.push(expected);
  }
  function peg$buildStructuredError(expected, found, location2) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location2
    );
  }
  function peg$parsepgn() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parsetagPairSection();
    s2 = peg$parsemoveTextSection();
    s0 = peg$f0(s1, s2);
    return s0;
  }
  function peg$parsetagPairSection() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsetagPair();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsetagPair();
    }
    s2 = peg$parse_();
    s0 = peg$f1(s1);
    return s0;
  }
  function peg$parsetagPair() {
    var s0, s2, s4, s6, s7, s8, s10;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 91) {
      s2 = peg$c0;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e1);
      }
    }
    if (s2 !== peg$FAILED) {
      peg$parse_();
      s4 = peg$parsetagName();
      if (s4 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 34) {
          s6 = peg$c1;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e2);
          }
        }
        if (s6 !== peg$FAILED) {
          s7 = peg$parsetagValue();
          if (input.charCodeAt(peg$currPos) === 34) {
            s8 = peg$c1;
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s8 !== peg$FAILED) {
            peg$parse_();
            if (input.charCodeAt(peg$currPos) === 93) {
              s10 = peg$c2;
              peg$currPos++;
            } else {
              s10 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e3);
              }
            }
            if (s10 !== peg$FAILED) {
              s0 = peg$f2(s4, s7);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e0);
      }
    }
    return s0;
  }
  function peg$parsetagName() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r0.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e5);
      }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r0.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e5);
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e4);
      }
    }
    return s0;
  }
  function peg$parsetagValue() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r1.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e7);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
    }
    s0 = input.substring(s0, peg$currPos);
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e6);
    }
    return s0;
  }
  function peg$parsemoveTextSection() {
    var s0, s1, s3;
    s0 = peg$currPos;
    s1 = peg$parseline();
    peg$parse_();
    s3 = peg$parsegameTerminationMarker();
    if (s3 === peg$FAILED) {
      s3 = null;
    }
    peg$parse_();
    s0 = peg$f3(s1, s3);
    return s0;
  }
  function peg$parseline() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$parsecomment();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = [];
    s3 = peg$parsemove();
    while (s3 !== peg$FAILED) {
      s2.push(s3);
      s3 = peg$parsemove();
    }
    s0 = peg$f4(s1, s2);
    return s0;
  }
  function peg$parsemove() {
    var s0, s4, s5, s6, s7, s8, s9, s10;
    s0 = peg$currPos;
    peg$parse_();
    peg$parsemoveNumber();
    peg$parse_();
    s4 = peg$parsesan();
    if (s4 !== peg$FAILED) {
      s5 = peg$parsesuffixAnnotation();
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s6 = [];
      s7 = peg$parsenag();
      while (s7 !== peg$FAILED) {
        s6.push(s7);
        s7 = peg$parsenag();
      }
      s7 = peg$parse_();
      s8 = peg$parsecomment();
      if (s8 === peg$FAILED) {
        s8 = null;
      }
      s9 = [];
      s10 = peg$parsevariation();
      while (s10 !== peg$FAILED) {
        s9.push(s10);
        s10 = peg$parsevariation();
      }
      s0 = peg$f5(s4, s5, s6, s8, s9);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    return s0;
  }
  function peg$parsemoveNumber() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e9);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
    }
    if (input.charCodeAt(peg$currPos) === 46) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e10);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r3.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e11);
        }
      }
      while (s5 !== peg$FAILED) {
        s4.push(s5);
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
      }
      s1 = [s1, s2, s3, s4];
      s0 = s1;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e8);
      }
    }
    return s0;
  }
  function peg$parsesan() {
    var s0, s1, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c4) {
      s2 = peg$c4;
      peg$currPos += 5;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e13);
      }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c5) {
        s2 = peg$c5;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e14);
        }
      }
      if (s2 === peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c6) {
          s2 = peg$c6;
          peg$currPos += 5;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e15);
          }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c7) {
            s2 = peg$c7;
            peg$currPos += 3;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e16);
            }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = input.charAt(peg$currPos);
            if (peg$r0.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e5);
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = input.charAt(peg$currPos);
              if (peg$r4.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e17);
                }
              }
              if (s5 !== peg$FAILED) {
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = input.charAt(peg$currPos);
                  if (peg$r4.test(s5)) {
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e17);
                    }
                  }
                }
              } else {
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        }
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r5.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e18);
        }
      }
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s2 = [s2, s3];
      s1 = s2;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s0 = input.substring(s0, peg$currPos);
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e12);
      }
    }
    return s0;
  }
  function peg$parsesuffixAnnotation() {
    var s0, s1, s2;
    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = input.charAt(peg$currPos);
    if (peg$r6.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e20);
      }
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      if (s1.length >= 2) {
        s2 = peg$FAILED;
      } else {
        s2 = input.charAt(peg$currPos);
        if (peg$r6.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e20);
          }
        }
      }
    }
    if (s1.length < 1) {
      peg$currPos = s0;
      s0 = peg$FAILED;
    } else {
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e19);
      }
    }
    return s0;
  }
  function peg$parsenag() {
    var s0, s2, s3, s4, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 36) {
      s2 = peg$c8;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e22);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      s4 = [];
      s5 = input.charAt(peg$currPos);
      if (peg$r2.test(s5)) {
        peg$currPos++;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r2.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
        }
      } else {
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s3 = input.substring(s3, peg$currPos);
      } else {
        s3 = s4;
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f6(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e21);
      }
    }
    return s0;
  }
  function peg$parsecomment() {
    var s0;
    s0 = peg$parsebraceComment();
    if (s0 === peg$FAILED) {
      s0 = peg$parserestOfLineComment();
    }
    return s0;
  }
  function peg$parsebraceComment() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 123) {
      s1 = peg$c9;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e24);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r7.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e25);
        }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r7.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      if (input.charCodeAt(peg$currPos) === 125) {
        s3 = peg$c10;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e26);
        }
      }
      if (s3 !== peg$FAILED) {
        s0 = peg$f7(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e23);
      }
    }
    return s0;
  }
  function peg$parserestOfLineComment() {
    var s0, s1, s2, s3, s4;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 59) {
      s1 = peg$c11;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e28);
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r8.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e29);
        }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r8.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
      }
      s2 = input.substring(s2, peg$currPos);
      s0 = peg$f8(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e27);
      }
    }
    return s0;
  }
  function peg$parsevariation() {
    var s0, s2, s3, s5;
    peg$silentFails++;
    s0 = peg$currPos;
    peg$parse_();
    if (input.charCodeAt(peg$currPos) === 40) {
      s2 = peg$c12;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e31);
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parseline();
      if (s3 !== peg$FAILED) {
        peg$parse_();
        if (input.charCodeAt(peg$currPos) === 41) {
          s5 = peg$c13;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e32);
          }
        }
        if (s5 !== peg$FAILED) {
          s0 = peg$f9(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) {
        peg$fail(peg$e30);
      }
    }
    return s0;
  }
  function peg$parsegameTerminationMarker() {
    var s0, s1, s3;
    peg$silentFails++;
    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c14) {
      s1 = peg$c14;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e34);
      }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e35);
        }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 7;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e36);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s1 = peg$c17;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e37);
            }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$parse_();
      s3 = peg$parsecomment();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s0 = peg$f10(s1, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e33);
      }
    }
    return s0;
  }
  function peg$parse_() {
    var s0, s1;
    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r9.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e39);
      }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e39);
        }
      }
    }
    peg$silentFails--;
    s1 = peg$FAILED;
    if (peg$silentFails === 0) {
      peg$fail(peg$e38);
    }
    return s0;
  }
  peg$result = peg$startRuleFunction();
  if (options.peg$library) {
    return (
      /** @type {any} */
      {
        peg$result,
        peg$currPos,
        peg$FAILED,
        peg$maxFailExpected,
        peg$maxFailPos
      }
    );
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }
    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}
var MASK64 = 0xffffffffffffffffn;
function rotl(x, k) {
  return (x << k | x >> 64n - k) & 0xffffffffffffffffn;
}
function wrappingMul(x, y) {
  return x * y & MASK64;
}
function xoroshiro128(state) {
  return function() {
    let s0 = BigInt(state & MASK64);
    let s1 = BigInt(state >> 64n & MASK64);
    const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
    s1 ^= s0;
    s0 = (rotl(s0, 24n) ^ s1 ^ s1 << 16n) & MASK64;
    s1 = rotl(s1, 37n);
    state = s1 << 64n | s0;
    return result;
  };
}
var rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
var PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
var EP_KEYS = Array.from({ length: 8 }, () => rand());
var CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
var SIDE_KEY = rand();
var WHITE = "w";
var BLACK = "b";
var PAWN = "p";
var KNIGHT = "n";
var BISHOP = "b";
var ROOK = "r";
var QUEEN = "q";
var KING = "k";
var DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var Move = class {
  color;
  from;
  to;
  piece;
  captured;
  promotion;
  /**
   * @deprecated This field is deprecated and will be removed in version 2.0.0.
   * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
   * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
   * `isBigPawn`
   */
  flags;
  san;
  lan;
  before;
  after;
  constructor(chess, internal) {
    const { color, piece, from, to, flags, captured, promotion } = internal;
    const fromAlgebraic = algebraic(from);
    const toAlgebraic = algebraic(to);
    this.color = color;
    this.piece = piece;
    this.from = fromAlgebraic;
    this.to = toAlgebraic;
    this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
    this.lan = fromAlgebraic + toAlgebraic;
    this.before = chess.fen();
    chess["_makeMove"](internal);
    this.after = chess.fen();
    chess["_undoMove"]();
    this.flags = "";
    for (const flag in BITS) {
      if (BITS[flag] & flags) {
        this.flags += FLAGS[flag];
      }
    }
    if (captured) {
      this.captured = captured;
    }
    if (promotion) {
      this.promotion = promotion;
      this.lan += promotion;
    }
  }
  isCapture() {
    return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
  }
  isPromotion() {
    return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
  }
  isEnPassant() {
    return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
  }
  isKingsideCastle() {
    return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
  }
  isQueensideCastle() {
    return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
  }
  isBigPawn() {
    return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
  }
};
var EMPTY = -1;
var FLAGS = {
  NORMAL: "n",
  CAPTURE: "c",
  BIG_PAWN: "b",
  EP_CAPTURE: "e",
  PROMOTION: "p",
  KSIDE_CASTLE: "k",
  QSIDE_CASTLE: "q",
  NULL_MOVE: "-"
};
var BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  BIG_PAWN: 4,
  EP_CAPTURE: 8,
  PROMOTION: 16,
  KSIDE_CASTLE: 32,
  QSIDE_CASTLE: 64,
  NULL_MOVE: 128
};
var SEVEN_TAG_ROSTER = {
  Event: "?",
  Site: "?",
  Date: "????.??.??",
  Round: "?",
  White: "?",
  Black: "?",
  Result: "*"
};
var SUPLEMENTAL_TAGS = {
  WhiteTitle: null,
  BlackTitle: null,
  WhiteElo: null,
  BlackElo: null,
  WhiteUSCF: null,
  BlackUSCF: null,
  WhiteNA: null,
  BlackNA: null,
  WhiteType: null,
  BlackType: null,
  EventDate: null,
  EventSponsor: null,
  Section: null,
  Stage: null,
  Board: null,
  Opening: null,
  Variation: null,
  SubVariation: null,
  ECO: null,
  NIC: null,
  Time: null,
  UTCTime: null,
  UTCDate: null,
  TimeControl: null,
  SetUp: null,
  FEN: null,
  Termination: null,
  Annotator: null,
  Mode: null,
  PlyCount: null
};
var HEADER_TEMPLATE = {
  ...SEVEN_TAG_ROSTER,
  ...SUPLEMENTAL_TAGS
};
var Ox88 = {
  a8: 0,
  b8: 1,
  c8: 2,
  d8: 3,
  e8: 4,
  f8: 5,
  g8: 6,
  h8: 7,
  a7: 16,
  b7: 17,
  c7: 18,
  d7: 19,
  e7: 20,
  f7: 21,
  g7: 22,
  h7: 23,
  a6: 32,
  b6: 33,
  c6: 34,
  d6: 35,
  e6: 36,
  f6: 37,
  g6: 38,
  h6: 39,
  a5: 48,
  b5: 49,
  c5: 50,
  d5: 51,
  e5: 52,
  f5: 53,
  g5: 54,
  h5: 55,
  a4: 64,
  b4: 65,
  c4: 66,
  d4: 67,
  e4: 68,
  f4: 69,
  g4: 70,
  h4: 71,
  a3: 80,
  b3: 81,
  c3: 82,
  d3: 83,
  e3: 84,
  f3: 85,
  g3: 86,
  h3: 87,
  a2: 96,
  b2: 97,
  c2: 98,
  d2: 99,
  e2: 100,
  f2: 101,
  g2: 102,
  h2: 103,
  a1: 112,
  b1: 113,
  c1: 114,
  d1: 115,
  e1: 116,
  f1: 117,
  g1: 118,
  h1: 119
};
var PAWN_OFFSETS = {
  b: [16, 32, 17, 15],
  w: [-16, -32, -17, -15]
};
var PIECE_OFFSETS = {
  n: [-18, -33, -31, -14, 18, 33, 31, 14],
  b: [-17, -15, 17, 15],
  r: [-16, 1, 16, -1],
  q: [-17, -16, -15, 1, 17, 16, 15, -1],
  k: [-17, -16, -15, 1, 17, 16, 15, -1]
};
var ATTACKS = [
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  24,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  2,
  24,
  2,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  53,
  56,
  53,
  2,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  24,
  24,
  24,
  24,
  24,
  56,
  0,
  56,
  24,
  24,
  24,
  24,
  24,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  53,
  56,
  53,
  2,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  2,
  24,
  2,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  24,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  20,
  0,
  0,
  20,
  0,
  0,
  0,
  0,
  0,
  0,
  24,
  0,
  0,
  0,
  0,
  0,
  0,
  20
];
var RAYS = [
  17,
  0,
  0,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  17,
  0,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  0,
  16,
  0,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  0,
  16,
  0,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  0,
  16,
  0,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  17,
  16,
  15,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  -16,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  -16,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  -16,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  -17,
  0,
  0,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  0,
  -17,
  0,
  0,
  -15,
  0,
  0,
  0,
  0,
  0,
  0,
  -16,
  0,
  0,
  0,
  0,
  0,
  0,
  -17
];
var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
var SYMBOLS = "pnbrqkPNBRQK";
var PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
var RANK_1 = 7;
var RANK_2 = 6;
var RANK_7 = 1;
var RANK_8 = 0;
var SIDES = {
  [KING]: BITS.KSIDE_CASTLE,
  [QUEEN]: BITS.QSIDE_CASTLE
};
var ROOKS = {
  w: [
    { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
    { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
  ],
  b: [
    { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
    { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
  ]
};
var SECOND_RANK = { b: RANK_7, w: RANK_2 };
var SAN_NULLMOVE = "--";
function rank(square) {
  return square >> 4;
}
function file(square) {
  return square & 15;
}
function isDigit(c) {
  return "0123456789".indexOf(c) !== -1;
}
function algebraic(square) {
  const f = file(square);
  const r = rank(square);
  return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
}
function swapColor(color) {
  return color === WHITE ? BLACK : WHITE;
}
function validateFen(fen) {
  const tokens = fen.split(/\s+/);
  if (tokens.length !== 6) {
    return {
      ok: false,
      error: "Invalid FEN: must contain six space-delimited fields"
    };
  }
  const moveNumber = parseInt(tokens[5], 10);
  if (isNaN(moveNumber) || moveNumber <= 0) {
    return {
      ok: false,
      error: "Invalid FEN: move number must be a positive integer"
    };
  }
  const halfMoves = parseInt(tokens[4], 10);
  if (isNaN(halfMoves) || halfMoves < 0) {
    return {
      ok: false,
      error: "Invalid FEN: half move counter number must be a non-negative integer"
    };
  }
  if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
    return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
  }
  if (/[^kKqQ-]/.test(tokens[2])) {
    return { ok: false, error: "Invalid FEN: castling availability is invalid" };
  }
  if (!/^(w|b)$/.test(tokens[1])) {
    return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
  }
  const rows = tokens[0].split("/");
  if (rows.length !== 8) {
    return {
      ok: false,
      error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
    };
  }
  for (let i = 0; i < rows.length; i++) {
    let sumFields = 0;
    let previousWasNumber = false;
    for (let k = 0; k < rows[i].length; k++) {
      if (isDigit(rows[i][k])) {
        if (previousWasNumber) {
          return {
            ok: false,
            error: "Invalid FEN: piece data is invalid (consecutive number)"
          };
        }
        sumFields += parseInt(rows[i][k], 10);
        previousWasNumber = true;
      } else {
        if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
          return {
            ok: false,
            error: "Invalid FEN: piece data is invalid (invalid piece)"
          };
        }
        sumFields += 1;
        previousWasNumber = false;
      }
    }
    if (sumFields !== 8) {
      return {
        ok: false,
        error: "Invalid FEN: piece data is invalid (too many squares in rank)"
      };
    }
  }
  if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
    return { ok: false, error: "Invalid FEN: illegal en-passant square" };
  }
  const kings = [
    { color: "white", regex: /K/g },
    { color: "black", regex: /k/g }
  ];
  for (const { color, regex } of kings) {
    if (!regex.test(tokens[0])) {
      return { ok: false, error: `Invalid FEN: missing ${color} king` };
    }
    if ((tokens[0].match(regex) || []).length > 1) {
      return { ok: false, error: `Invalid FEN: too many ${color} kings` };
    }
  }
  if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
    return {
      ok: false,
      error: "Invalid FEN: some pawns are on the edge rows"
    };
  }
  return { ok: true };
}
function getDisambiguator(move3, moves2) {
  const from = move3.from;
  const to = move3.to;
  const piece = move3.piece;
  let ambiguities = 0;
  let sameRank = 0;
  let sameFile = 0;
  for (let i = 0, len = moves2.length; i < len; i++) {
    const ambigFrom = moves2[i].from;
    const ambigTo = moves2[i].to;
    const ambigPiece = moves2[i].piece;
    if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
      ambiguities++;
      if (rank(from) === rank(ambigFrom)) {
        sameRank++;
      }
      if (file(from) === file(ambigFrom)) {
        sameFile++;
      }
    }
  }
  if (ambiguities > 0) {
    if (sameRank > 0 && sameFile > 0) {
      return algebraic(from);
    } else if (sameFile > 0) {
      return algebraic(from).charAt(1);
    } else {
      return algebraic(from).charAt(0);
    }
  }
  return "";
}
function addMove(moves2, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
  const r = rank(to);
  if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
    for (let i = 0; i < PROMOTIONS.length; i++) {
      const promotion = PROMOTIONS[i];
      moves2.push({
        color,
        from,
        to,
        piece,
        captured,
        promotion,
        flags: flags | BITS.PROMOTION
      });
    }
  } else {
    moves2.push({
      color,
      from,
      to,
      piece,
      captured,
      flags
    });
  }
}
function inferPieceType(san) {
  let pieceType = san.charAt(0);
  if (pieceType >= "a" && pieceType <= "h") {
    const matches = san.match(/[a-h]\d.*[a-h]\d/);
    if (matches) {
      return void 0;
    }
    return PAWN;
  }
  pieceType = pieceType.toLowerCase();
  if (pieceType === "o") {
    return KING;
  }
  return pieceType;
}
function strippedSan(move3) {
  return move3.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
}
var Chess = class {
  _board = new Array(128);
  _turn = WHITE;
  _header = {};
  _kings = { w: EMPTY, b: EMPTY };
  _epSquare = -1;
  _halfMoves = 0;
  _moveNumber = 0;
  _history = [];
  _comments = {};
  _castling = { w: 0, b: 0 };
  _hash = 0n;
  // tracks number of times a position has been seen for repetition checking
  _positionCount = /* @__PURE__ */ new Map();
  constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
    this.load(fen, { skipValidation });
  }
  clear({ preserveHeaders = false } = {}) {
    this._board = new Array(128);
    this._kings = { w: EMPTY, b: EMPTY };
    this._turn = WHITE;
    this._castling = { w: 0, b: 0 };
    this._epSquare = EMPTY;
    this._halfMoves = 0;
    this._moveNumber = 1;
    this._history = [];
    this._comments = {};
    this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
    this._hash = this._computeHash();
    this._positionCount = /* @__PURE__ */ new Map();
    this._header["SetUp"] = null;
    this._header["FEN"] = null;
  }
  load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
    let tokens = fen.split(/\s+/);
    if (tokens.length >= 2 && tokens.length < 6) {
      const adjustments = ["-", "-", "0", "1"];
      fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
    }
    tokens = fen.split(/\s+/);
    if (!skipValidation) {
      const { ok, error } = validateFen(fen);
      if (!ok) {
        throw new Error(error);
      }
    }
    const position = tokens[0];
    let square = 0;
    this.clear({ preserveHeaders });
    for (let i = 0; i < position.length; i++) {
      const piece = position.charAt(i);
      if (piece === "/") {
        square += 8;
      } else if (isDigit(piece)) {
        square += parseInt(piece, 10);
      } else {
        const color = piece < "a" ? WHITE : BLACK;
        this._put({ type: piece.toLowerCase(), color }, algebraic(square));
        square++;
      }
    }
    this._turn = tokens[1];
    if (tokens[2].indexOf("K") > -1) {
      this._castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf("Q") > -1) {
      this._castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf("k") > -1) {
      this._castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf("q") > -1) {
      this._castling.b |= BITS.QSIDE_CASTLE;
    }
    this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
    this._halfMoves = parseInt(tokens[4], 10);
    this._moveNumber = parseInt(tokens[5], 10);
    this._hash = this._computeHash();
    this._updateSetup(fen);
    this._incPositionCount();
  }
  fen({ forceEnpassantSquare = false } = {}) {
    let empty = 0;
    let fen = "";
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i]) {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        const { color, type: piece } = this._board[i];
        fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
      } else {
        empty++;
      }
      if (i + 1 & 136) {
        if (empty > 0) {
          fen += empty;
        }
        if (i !== Ox88.h1) {
          fen += "/";
        }
        empty = 0;
        i += 8;
      }
    }
    let castling = "";
    if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
      castling += "K";
    }
    if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
      castling += "Q";
    }
    if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
      castling += "k";
    }
    if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
      castling += "q";
    }
    castling = castling || "-";
    let epSquare = "-";
    if (this._epSquare !== EMPTY) {
      if (forceEnpassantSquare) {
        epSquare = algebraic(this._epSquare);
      } else {
        const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
        const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
        for (const square of squares) {
          if (square & 136) {
            continue;
          }
          const color = this._turn;
          if (this._board[square]?.color === color && this._board[square]?.type === PAWN) {
            this._makeMove({
              color,
              from: square,
              to: this._epSquare,
              piece: PAWN,
              captured: PAWN,
              flags: BITS.EP_CAPTURE
            });
            const isLegal = !this._isKingAttacked(color);
            this._undoMove();
            if (isLegal) {
              epSquare = algebraic(this._epSquare);
              break;
            }
          }
        }
      }
    }
    return [
      fen,
      this._turn,
      castling,
      epSquare,
      this._halfMoves,
      this._moveNumber
    ].join(" ");
  }
  _pieceKey(i) {
    if (!this._board[i]) {
      return 0n;
    }
    const { color, type } = this._board[i];
    const colorIndex = {
      w: 0,
      b: 1
    }[color];
    const typeIndex = {
      p: 0,
      n: 1,
      b: 2,
      r: 3,
      q: 4,
      k: 5
    }[type];
    return PIECE_KEYS[colorIndex][typeIndex][i];
  }
  _epKey() {
    return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
  }
  _castlingKey() {
    const index = this._castling.w >> 5 | this._castling.b >> 3;
    return CASTLING_KEYS[index];
  }
  _computeHash() {
    let hash2 = 0n;
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (this._board[i]) {
        hash2 ^= this._pieceKey(i);
      }
    }
    hash2 ^= this._epKey();
    hash2 ^= this._castlingKey();
    if (this._turn === "b") {
      hash2 ^= SIDE_KEY;
    }
    return hash2;
  }
  /*
   * Called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object. If the FEN
   * is equal to the default position, the SetUp and FEN are deleted the setup
   * is only updated if history.length is zero, ie moves haven't been made.
   */
  _updateSetup(fen) {
    if (this._history.length > 0)
      return;
    if (fen !== DEFAULT_POSITION) {
      this._header["SetUp"] = "1";
      this._header["FEN"] = fen;
    } else {
      this._header["SetUp"] = null;
      this._header["FEN"] = null;
    }
  }
  reset() {
    this.load(DEFAULT_POSITION);
  }
  get(square) {
    return this._board[Ox88[square]];
  }
  findPiece(piece) {
    const squares = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (!this._board[i] || this._board[i]?.color !== piece.color) {
        continue;
      }
      if (this._board[i].color === piece.color && this._board[i].type === piece.type) {
        squares.push(algebraic(i));
      }
    }
    return squares;
  }
  put({ type, color }, square) {
    if (this._put({ type, color }, square)) {
      this._updateCastlingRights();
      this._updateEnPassantSquare();
      this._updateSetup(this.fen());
      return true;
    }
    return false;
  }
  _set(sq, piece) {
    this._hash ^= this._pieceKey(sq);
    this._board[sq] = piece;
    this._hash ^= this._pieceKey(sq);
  }
  _put({ type, color }, square) {
    if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
      return false;
    }
    if (!(square in Ox88)) {
      return false;
    }
    const sq = Ox88[square];
    if (type == KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
      return false;
    }
    const currentPieceOnSquare = this._board[sq];
    if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
      this._kings[currentPieceOnSquare.color] = EMPTY;
    }
    this._set(sq, { type, color });
    if (type === KING) {
      this._kings[color] = sq;
    }
    return true;
  }
  _clear(sq) {
    this._hash ^= this._pieceKey(sq);
    delete this._board[sq];
  }
  remove(square) {
    const piece = this.get(square);
    this._clear(Ox88[square]);
    if (piece && piece.type === KING) {
      this._kings[piece.color] = EMPTY;
    }
    this._updateCastlingRights();
    this._updateEnPassantSquare();
    this._updateSetup(this.fen());
    return piece;
  }
  _updateCastlingRights() {
    this._hash ^= this._castlingKey();
    const whiteKingInPlace = this._board[Ox88.e1]?.type === KING && this._board[Ox88.e1]?.color === WHITE;
    const blackKingInPlace = this._board[Ox88.e8]?.type === KING && this._board[Ox88.e8]?.color === BLACK;
    if (!whiteKingInPlace || this._board[Ox88.a1]?.type !== ROOK || this._board[Ox88.a1]?.color !== WHITE) {
      this._castling.w &= -65;
    }
    if (!whiteKingInPlace || this._board[Ox88.h1]?.type !== ROOK || this._board[Ox88.h1]?.color !== WHITE) {
      this._castling.w &= -33;
    }
    if (!blackKingInPlace || this._board[Ox88.a8]?.type !== ROOK || this._board[Ox88.a8]?.color !== BLACK) {
      this._castling.b &= -65;
    }
    if (!blackKingInPlace || this._board[Ox88.h8]?.type !== ROOK || this._board[Ox88.h8]?.color !== BLACK) {
      this._castling.b &= -33;
    }
    this._hash ^= this._castlingKey();
  }
  _updateEnPassantSquare() {
    if (this._epSquare === EMPTY) {
      return;
    }
    const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
    const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
    const attackers = [currentSquare + 1, currentSquare - 1];
    if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || this._board[currentSquare]?.color !== swapColor(this._turn) || this._board[currentSquare]?.type !== PAWN) {
      this._hash ^= this._epKey();
      this._epSquare = EMPTY;
      return;
    }
    const canCapture = (square) => !(square & 136) && this._board[square]?.color === this._turn && this._board[square]?.type === PAWN;
    if (!attackers.some(canCapture)) {
      this._hash ^= this._epKey();
      this._epSquare = EMPTY;
    }
  }
  _attacked(color, square, verbose) {
    const attackers = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (i & 136) {
        i += 7;
        continue;
      }
      if (this._board[i] === void 0 || this._board[i].color !== color) {
        continue;
      }
      const piece = this._board[i];
      const difference = i - square;
      if (difference === 0) {
        continue;
      }
      const index = difference + 119;
      if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
        if (piece.type === PAWN) {
          if (difference > 0 && piece.color === WHITE || difference <= 0 && piece.color === BLACK) {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
            }
          }
          continue;
        }
        if (piece.type === "n" || piece.type === "k") {
          if (!verbose) {
            return true;
          } else {
            attackers.push(algebraic(i));
            continue;
          }
        }
        const offset = RAYS[index];
        let j = i + offset;
        let blocked = false;
        while (j !== square) {
          if (this._board[j] != null) {
            blocked = true;
            break;
          }
          j += offset;
        }
        if (!blocked) {
          if (!verbose) {
            return true;
          } else {
            attackers.push(algebraic(i));
            continue;
          }
        }
      }
    }
    if (verbose) {
      return attackers;
    } else {
      return false;
    }
  }
  attackers(square, attackedBy) {
    if (!attackedBy) {
      return this._attacked(this._turn, Ox88[square], true);
    } else {
      return this._attacked(attackedBy, Ox88[square], true);
    }
  }
  _isKingAttacked(color) {
    const square = this._kings[color];
    return square === -1 ? false : this._attacked(swapColor(color), square);
  }
  hash() {
    return this._hash.toString(16);
  }
  isAttacked(square, attackedBy) {
    return this._attacked(attackedBy, Ox88[square]);
  }
  isCheck() {
    return this._isKingAttacked(this._turn);
  }
  inCheck() {
    return this.isCheck();
  }
  isCheckmate() {
    return this.isCheck() && this._moves().length === 0;
  }
  isStalemate() {
    return !this.isCheck() && this._moves().length === 0;
  }
  isInsufficientMaterial() {
    const pieces = {
      b: 0,
      n: 0,
      r: 0,
      q: 0,
      k: 0,
      p: 0
    };
    const bishops = [];
    let numPieces = 0;
    let squareColor = 0;
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      squareColor = (squareColor + 1) % 2;
      if (i & 136) {
        i += 7;
        continue;
      }
      const piece = this._board[i];
      if (piece) {
        pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(squareColor);
        }
        numPieces++;
      }
    }
    if (numPieces === 2) {
      return true;
    } else if (
      // k vs. kn .... or .... k vs. kb
      numPieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
    ) {
      return true;
    } else if (numPieces === pieces[BISHOP] + 2) {
      let sum = 0;
      const len = bishops.length;
      for (let i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) {
        return true;
      }
    }
    return false;
  }
  isThreefoldRepetition() {
    return this._getPositionCount(this._hash) >= 3;
  }
  isDrawByFiftyMoves() {
    return this._halfMoves >= 100;
  }
  isDraw() {
    return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
  }
  isGameOver() {
    return this.isCheckmate() || this.isDraw();
  }
  moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
    const moves2 = this._moves({ square, piece });
    if (verbose) {
      return moves2.map((move3) => new Move(this, move3));
    } else {
      return moves2.map((move3) => this._moveToSan(move3, moves2));
    }
  }
  _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
    const forSquare = square ? square.toLowerCase() : void 0;
    const forPiece = piece?.toLowerCase();
    const moves2 = [];
    const us = this._turn;
    const them = swapColor(us);
    let firstSquare = Ox88.a8;
    let lastSquare = Ox88.h1;
    let singleSquare = false;
    if (forSquare) {
      if (!(forSquare in Ox88)) {
        return [];
      } else {
        firstSquare = lastSquare = Ox88[forSquare];
        singleSquare = true;
      }
    }
    for (let from = firstSquare; from <= lastSquare; from++) {
      if (from & 136) {
        from += 7;
        continue;
      }
      if (!this._board[from] || this._board[from].color === them) {
        continue;
      }
      const { type } = this._board[from];
      let to;
      if (type === PAWN) {
        if (forPiece && forPiece !== type)
          continue;
        to = from + PAWN_OFFSETS[us][0];
        if (!this._board[to]) {
          addMove(moves2, us, from, to, PAWN);
          to = from + PAWN_OFFSETS[us][1];
          if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
            addMove(moves2, us, from, to, PAWN, void 0, BITS.BIG_PAWN);
          }
        }
        for (let j = 2; j < 4; j++) {
          to = from + PAWN_OFFSETS[us][j];
          if (to & 136)
            continue;
          if (this._board[to]?.color === them) {
            addMove(moves2, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
          } else if (to === this._epSquare) {
            addMove(moves2, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
          }
        }
      } else {
        if (forPiece && forPiece !== type)
          continue;
        for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
          const offset = PIECE_OFFSETS[type][j];
          to = from;
          while (true) {
            to += offset;
            if (to & 136)
              break;
            if (!this._board[to]) {
              addMove(moves2, us, from, to, type);
            } else {
              if (this._board[to].color === us)
                break;
              addMove(moves2, us, from, to, type, this._board[to].type, BITS.CAPTURE);
              break;
            }
            if (type === KNIGHT || type === KING)
              break;
          }
        }
      }
    }
    if (forPiece === void 0 || forPiece === KING) {
      if (!singleSquare || lastSquare === this._kings[us]) {
        if (this._castling[us] & BITS.KSIDE_CASTLE) {
          const castlingFrom = this._kings[us];
          const castlingTo = castlingFrom + 2;
          if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
            addMove(moves2, us, this._kings[us], castlingTo, KING, void 0, BITS.KSIDE_CASTLE);
          }
        }
        if (this._castling[us] & BITS.QSIDE_CASTLE) {
          const castlingFrom = this._kings[us];
          const castlingTo = castlingFrom - 2;
          if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
            addMove(moves2, us, this._kings[us], castlingTo, KING, void 0, BITS.QSIDE_CASTLE);
          }
        }
      }
    }
    if (!legal || this._kings[us] === -1) {
      return moves2;
    }
    const legalMoves = [];
    for (let i = 0, len = moves2.length; i < len; i++) {
      this._makeMove(moves2[i]);
      if (!this._isKingAttacked(us)) {
        legalMoves.push(moves2[i]);
      }
      this._undoMove();
    }
    return legalMoves;
  }
  move(move3, { strict = false } = {}) {
    let moveObj = null;
    if (typeof move3 === "string") {
      moveObj = this._moveFromSan(move3, strict);
    } else if (move3 === null) {
      moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
    } else if (typeof move3 === "object") {
      const moves2 = this._moves();
      for (let i = 0, len = moves2.length; i < len; i++) {
        if (move3.from === algebraic(moves2[i].from) && move3.to === algebraic(moves2[i].to) && (!("promotion" in moves2[i]) || move3.promotion === moves2[i].promotion)) {
          moveObj = moves2[i];
          break;
        }
      }
    }
    if (!moveObj) {
      if (typeof move3 === "string") {
        throw new Error(`Invalid move: ${move3}`);
      } else {
        throw new Error(`Invalid move: ${JSON.stringify(move3)}`);
      }
    }
    if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
      throw new Error("Null move not allowed when in check");
    }
    const prettyMove = new Move(this, moveObj);
    this._makeMove(moveObj);
    this._incPositionCount();
    return prettyMove;
  }
  _push(move3) {
    this._history.push({
      move: move3,
      kings: { b: this._kings.b, w: this._kings.w },
      turn: this._turn,
      castling: { b: this._castling.b, w: this._castling.w },
      epSquare: this._epSquare,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber
    });
  }
  _movePiece(from, to) {
    this._hash ^= this._pieceKey(from);
    this._board[to] = this._board[from];
    delete this._board[from];
    this._hash ^= this._pieceKey(to);
  }
  _makeMove(move3) {
    const us = this._turn;
    const them = swapColor(us);
    this._push(move3);
    if (move3.flags & BITS.NULL_MOVE) {
      if (us === BLACK) {
        this._moveNumber++;
      }
      this._halfMoves++;
      this._turn = them;
      this._epSquare = EMPTY;
      return;
    }
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    if (move3.captured) {
      this._hash ^= this._pieceKey(move3.to);
    }
    this._movePiece(move3.from, move3.to);
    if (move3.flags & BITS.EP_CAPTURE) {
      if (this._turn === BLACK) {
        this._clear(move3.to - 16);
      } else {
        this._clear(move3.to + 16);
      }
    }
    if (move3.promotion) {
      this._clear(move3.to);
      this._set(move3.to, { type: move3.promotion, color: us });
    }
    if (this._board[move3.to].type === KING) {
      this._kings[us] = move3.to;
      if (move3.flags & BITS.KSIDE_CASTLE) {
        const castlingTo = move3.to - 1;
        const castlingFrom = move3.to + 1;
        this._movePiece(castlingFrom, castlingTo);
      } else if (move3.flags & BITS.QSIDE_CASTLE) {
        const castlingTo = move3.to + 1;
        const castlingFrom = move3.to - 2;
        this._movePiece(castlingFrom, castlingTo);
      }
      this._castling[us] = 0;
    }
    if (this._castling[us]) {
      for (let i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move3.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
          this._castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }
    if (this._castling[them]) {
      for (let i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move3.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
          this._castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }
    this._hash ^= this._castlingKey();
    if (move3.flags & BITS.BIG_PAWN) {
      let epSquare;
      if (us === BLACK) {
        epSquare = move3.to - 16;
      } else {
        epSquare = move3.to + 16;
      }
      if (!(move3.to - 1 & 136) && this._board[move3.to - 1]?.type === PAWN && this._board[move3.to - 1]?.color === them || !(move3.to + 1 & 136) && this._board[move3.to + 1]?.type === PAWN && this._board[move3.to + 1]?.color === them) {
        this._epSquare = epSquare;
        this._hash ^= this._epKey();
      } else {
        this._epSquare = EMPTY;
      }
    } else {
      this._epSquare = EMPTY;
    }
    if (move3.piece === PAWN) {
      this._halfMoves = 0;
    } else if (move3.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      this._halfMoves = 0;
    } else {
      this._halfMoves++;
    }
    if (us === BLACK) {
      this._moveNumber++;
    }
    this._turn = them;
    this._hash ^= SIDE_KEY;
  }
  undo() {
    const hash2 = this._hash;
    const move3 = this._undoMove();
    if (move3) {
      const prettyMove = new Move(this, move3);
      this._decPositionCount(hash2);
      return prettyMove;
    }
    return null;
  }
  _undoMove() {
    const old = this._history.pop();
    if (old === void 0) {
      return null;
    }
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    const move3 = old.move;
    this._kings = old.kings;
    this._turn = old.turn;
    this._castling = old.castling;
    this._epSquare = old.epSquare;
    this._halfMoves = old.halfMoves;
    this._moveNumber = old.moveNumber;
    this._hash ^= this._epKey();
    this._hash ^= this._castlingKey();
    this._hash ^= SIDE_KEY;
    const us = this._turn;
    const them = swapColor(us);
    if (move3.flags & BITS.NULL_MOVE) {
      return move3;
    }
    this._movePiece(move3.to, move3.from);
    if (move3.piece) {
      this._clear(move3.from);
      this._set(move3.from, { type: move3.piece, color: us });
    }
    if (move3.captured) {
      if (move3.flags & BITS.EP_CAPTURE) {
        let index;
        if (us === BLACK) {
          index = move3.to - 16;
        } else {
          index = move3.to + 16;
        }
        this._set(index, { type: PAWN, color: them });
      } else {
        this._set(move3.to, { type: move3.captured, color: them });
      }
    }
    if (move3.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      let castlingTo, castlingFrom;
      if (move3.flags & BITS.KSIDE_CASTLE) {
        castlingTo = move3.to + 1;
        castlingFrom = move3.to - 1;
      } else {
        castlingTo = move3.to - 2;
        castlingFrom = move3.to + 1;
      }
      this._movePiece(castlingFrom, castlingTo);
    }
    return move3;
  }
  pgn({ newline = "\n", maxWidth = 0 } = {}) {
    const result = [];
    let headerExists = false;
    for (const i in this._header) {
      const headerTag = this._header[i];
      if (headerTag)
        result.push(`[${i} "${this._header[i]}"]` + newline);
      headerExists = true;
    }
    if (headerExists && this._history.length) {
      result.push(newline);
    }
    const appendComment = (moveString2) => {
      const comment = this._comments[this.fen()];
      if (typeof comment !== "undefined") {
        const delimiter = moveString2.length > 0 ? " " : "";
        moveString2 = `${moveString2}${delimiter}{${comment}}`;
      }
      return moveString2;
    };
    const reversedHistory = [];
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    const moves2 = [];
    let moveString = "";
    if (reversedHistory.length === 0) {
      moves2.push(appendComment(""));
    }
    while (reversedHistory.length > 0) {
      moveString = appendComment(moveString);
      const move3 = reversedHistory.pop();
      if (!move3) {
        break;
      }
      if (!this._history.length && move3.color === "b") {
        const prefix = `${this._moveNumber}. ...`;
        moveString = moveString ? `${moveString} ${prefix}` : prefix;
      } else if (move3.color === "w") {
        if (moveString.length) {
          moves2.push(moveString);
        }
        moveString = this._moveNumber + ".";
      }
      moveString = moveString + " " + this._moveToSan(move3, this._moves({ legal: true }));
      this._makeMove(move3);
    }
    if (moveString.length) {
      moves2.push(appendComment(moveString));
    }
    moves2.push(this._header.Result || "*");
    if (maxWidth === 0) {
      return result.join("") + moves2.join(" ");
    }
    const strip = function() {
      if (result.length > 0 && result[result.length - 1] === " ") {
        result.pop();
        return true;
      }
      return false;
    };
    const wrapComment = function(width, move3) {
      for (const token of move3.split(" ")) {
        if (!token) {
          continue;
        }
        if (width + token.length > maxWidth) {
          while (strip()) {
            width--;
          }
          result.push(newline);
          width = 0;
        }
        result.push(token);
        width += token.length;
        result.push(" ");
        width++;
      }
      if (strip()) {
        width--;
      }
      return width;
    };
    let currentWidth = 0;
    for (let i = 0; i < moves2.length; i++) {
      if (currentWidth + moves2[i].length > maxWidth) {
        if (moves2[i].includes("{")) {
          currentWidth = wrapComment(currentWidth, moves2[i]);
          continue;
        }
      }
      if (currentWidth + moves2[i].length > maxWidth && i !== 0) {
        if (result[result.length - 1] === " ") {
          result.pop();
        }
        result.push(newline);
        currentWidth = 0;
      } else if (i !== 0) {
        result.push(" ");
        currentWidth++;
      }
      result.push(moves2[i]);
      currentWidth += moves2[i].length;
    }
    return result.join("");
  }
  /**
   * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
   */
  header(...args) {
    for (let i = 0; i < args.length; i += 2) {
      if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
        this._header[args[i]] = args[i + 1];
      }
    }
    return this._header;
  }
  // TODO: value validation per spec
  setHeader(key2, value2) {
    this._header[key2] = value2 ?? SEVEN_TAG_ROSTER[key2] ?? null;
    return this.getHeaders();
  }
  removeHeader(key2) {
    if (key2 in this._header) {
      this._header[key2] = SEVEN_TAG_ROSTER[key2] || null;
      return true;
    }
    return false;
  }
  // return only non-null headers (omit placemarker nulls)
  getHeaders() {
    const nonNullHeaders = {};
    for (const [key2, value2] of Object.entries(this._header)) {
      if (value2 !== null) {
        nonNullHeaders[key2] = value2;
      }
    }
    return nonNullHeaders;
  }
  loadPgn(pgn2, { strict = false, newlineChar = "\r?\n" } = {}) {
    if (newlineChar !== "\r?\n") {
      pgn2 = pgn2.replace(new RegExp(newlineChar, "g"), "\n");
    }
    const parsedPgn = peg$parse(pgn2);
    this.reset();
    const headers = parsedPgn.headers;
    let fen = "";
    for (const key2 in headers) {
      if (key2.toLowerCase() === "fen") {
        fen = headers[key2];
      }
      this.header(key2, headers[key2]);
    }
    if (!strict) {
      if (fen) {
        this.load(fen, { preserveHeaders: true });
      }
    } else {
      if (headers["SetUp"] === "1") {
        if (!("FEN" in headers)) {
          throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
        }
        this.load(headers["FEN"], { preserveHeaders: true });
      }
    }
    let node2 = parsedPgn.root;
    while (node2) {
      if (node2.move) {
        const move3 = this._moveFromSan(node2.move, strict);
        if (move3 == null) {
          throw new Error(`Invalid move in PGN: ${node2.move}`);
        } else {
          this._makeMove(move3);
          this._incPositionCount();
        }
      }
      if (node2.comment !== void 0) {
        this._comments[this.fen()] = node2.comment;
      }
      node2 = node2.variations[0];
    }
    const result = parsedPgn.result;
    if (result && Object.keys(this._header).length && this._header["Result"] !== result) {
      this.setHeader("Result", result);
    }
  }
  /*
   * Convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} strict Use the strict SAN parser. It will throw errors
   * on overly disambiguated moves (see below):
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  _moveToSan(move3, moves2) {
    let output = "";
    if (move3.flags & BITS.KSIDE_CASTLE) {
      output = "O-O";
    } else if (move3.flags & BITS.QSIDE_CASTLE) {
      output = "O-O-O";
    } else if (move3.flags & BITS.NULL_MOVE) {
      return SAN_NULLMOVE;
    } else {
      if (move3.piece !== PAWN) {
        const disambiguator = getDisambiguator(move3, moves2);
        output += move3.piece.toUpperCase() + disambiguator;
      }
      if (move3.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move3.piece === PAWN) {
          output += algebraic(move3.from)[0];
        }
        output += "x";
      }
      output += algebraic(move3.to);
      if (move3.promotion) {
        output += "=" + move3.promotion.toUpperCase();
      }
    }
    this._makeMove(move3);
    if (this.isCheck()) {
      if (this.isCheckmate()) {
        output += "#";
      } else {
        output += "+";
      }
    }
    this._undoMove();
    return output;
  }
  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  _moveFromSan(move3, strict = false) {
    let cleanMove = strippedSan(move3);
    if (!strict) {
      if (cleanMove === "0-0") {
        cleanMove = "O-O";
      } else if (cleanMove === "0-0-0") {
        cleanMove = "O-O-O";
      }
    }
    if (cleanMove == SAN_NULLMOVE) {
      const res = {
        color: this._turn,
        from: 0,
        to: 0,
        piece: "k",
        flags: BITS.NULL_MOVE
      };
      return res;
    }
    let pieceType = inferPieceType(cleanMove);
    let moves2 = this._moves({ legal: true, piece: pieceType });
    for (let i = 0, len = moves2.length; i < len; i++) {
      if (cleanMove === strippedSan(this._moveToSan(moves2[i], moves2))) {
        return moves2[i];
      }
    }
    if (strict) {
      return null;
    }
    let piece = void 0;
    let matches = void 0;
    let from = void 0;
    let to = void 0;
    let promotion = void 0;
    let overlyDisambiguated = false;
    matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
    if (matches) {
      piece = matches[1];
      from = matches[2];
      to = matches[3];
      promotion = matches[4];
      if (from.length == 1) {
        overlyDisambiguated = true;
      }
    } else {
      matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        piece = matches[1];
        from = matches[2];
        to = matches[3];
        promotion = matches[4];
        if (from.length == 1) {
          overlyDisambiguated = true;
        }
      }
    }
    pieceType = inferPieceType(cleanMove);
    moves2 = this._moves({
      legal: true,
      piece: piece ? piece : pieceType
    });
    if (!to) {
      return null;
    }
    for (let i = 0, len = moves2.length; i < len; i++) {
      if (!from) {
        if (cleanMove === strippedSan(this._moveToSan(moves2[i], moves2)).replace("x", "")) {
          return moves2[i];
        }
      } else if ((!piece || piece.toLowerCase() == moves2[i].piece) && Ox88[from] == moves2[i].from && Ox88[to] == moves2[i].to && (!promotion || promotion.toLowerCase() == moves2[i].promotion)) {
        return moves2[i];
      } else if (overlyDisambiguated) {
        const square = algebraic(moves2[i].from);
        if ((!piece || piece.toLowerCase() == moves2[i].piece) && Ox88[to] == moves2[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves2[i].promotion)) {
          return moves2[i];
        }
      }
    }
    return null;
  }
  ascii() {
    let s = "   +------------------------+\n";
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (file(i) === 0) {
        s += " " + "87654321"[rank(i)] + " |";
      }
      if (this._board[i]) {
        const piece = this._board[i].type;
        const color = this._board[i].color;
        const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
        s += " " + symbol + " ";
      } else {
        s += " . ";
      }
      if (i + 1 & 136) {
        s += "|\n";
        i += 8;
      }
    }
    s += "   +------------------------+\n";
    s += "     a  b  c  d  e  f  g  h";
    return s;
  }
  perft(depth) {
    const moves2 = this._moves({ legal: false });
    let nodes = 0;
    const color = this._turn;
    for (let i = 0, len = moves2.length; i < len; i++) {
      this._makeMove(moves2[i]);
      if (!this._isKingAttacked(color)) {
        if (depth - 1 > 0) {
          nodes += this.perft(depth - 1);
        } else {
          nodes++;
        }
      }
      this._undoMove();
    }
    return nodes;
  }
  setTurn(color) {
    if (this._turn == color) {
      return false;
    }
    this.move("--");
    return true;
  }
  turn() {
    return this._turn;
  }
  board() {
    const output = [];
    let row = [];
    for (let i = Ox88.a8; i <= Ox88.h1; i++) {
      if (this._board[i] == null) {
        row.push(null);
      } else {
        row.push({
          square: algebraic(i),
          type: this._board[i].type,
          color: this._board[i].color
        });
      }
      if (i + 1 & 136) {
        output.push(row);
        row = [];
        i += 8;
      }
    }
    return output;
  }
  squareColor(square) {
    if (square in Ox88) {
      const sq = Ox88[square];
      return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
    }
    return null;
  }
  history({ verbose = false } = {}) {
    const reversedHistory = [];
    const moveHistory = [];
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    while (true) {
      const move3 = reversedHistory.pop();
      if (!move3) {
        break;
      }
      if (verbose) {
        moveHistory.push(new Move(this, move3));
      } else {
        moveHistory.push(this._moveToSan(move3, this._moves()));
      }
      this._makeMove(move3);
    }
    return moveHistory;
  }
  /*
   * Keeps track of position occurrence counts for the purpose of repetition
   * checking. Old positions are removed from the map if their counts are reduced to 0.
   */
  _getPositionCount(hash2) {
    return this._positionCount.get(hash2) ?? 0;
  }
  _incPositionCount() {
    this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
  }
  _decPositionCount(hash2) {
    const currentCount = this._positionCount.get(hash2) ?? 0;
    if (currentCount === 1) {
      this._positionCount.delete(hash2);
    } else {
      this._positionCount.set(hash2, currentCount - 1);
    }
  }
  _pruneComments() {
    const reversedHistory = [];
    const currentComments = {};
    const copyComment = (fen) => {
      if (fen in this._comments) {
        currentComments[fen] = this._comments[fen];
      }
    };
    while (this._history.length > 0) {
      reversedHistory.push(this._undoMove());
    }
    copyComment(this.fen());
    while (true) {
      const move3 = reversedHistory.pop();
      if (!move3) {
        break;
      }
      this._makeMove(move3);
      copyComment(this.fen());
    }
    this._comments = currentComments;
  }
  getComment() {
    return this._comments[this.fen()];
  }
  setComment(comment) {
    this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
  }
  /**
   * @deprecated Renamed to `removeComment` for consistency
   */
  deleteComment() {
    return this.removeComment();
  }
  removeComment() {
    const comment = this._comments[this.fen()];
    delete this._comments[this.fen()];
    return comment;
  }
  getComments() {
    this._pruneComments();
    return Object.keys(this._comments).map((fen) => {
      return { fen, comment: this._comments[fen] };
    });
  }
  /**
   * @deprecated Renamed to `removeComments` for consistency
   */
  deleteComments() {
    return this.removeComments();
  }
  removeComments() {
    this._pruneComments();
    return Object.keys(this._comments).map((fen) => {
      const comment = this._comments[fen];
      delete this._comments[fen];
      return { fen, comment };
    });
  }
  setCastlingRights(color, rights) {
    for (const side of [KING, QUEEN]) {
      if (rights[side] !== void 0) {
        if (rights[side]) {
          this._castling[color] |= SIDES[side];
        } else {
          this._castling[color] &= ~SIDES[side];
        }
      }
    }
    this._updateCastlingRights();
    const result = this.getCastlingRights(color);
    return (rights[KING] === void 0 || rights[KING] === result[KING]) && (rights[QUEEN] === void 0 || rights[QUEEN] === result[QUEEN]);
  }
  getCastlingRights(color) {
    return {
      [KING]: (this._castling[color] & SIDES[KING]) !== 0,
      [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0
    };
  }
  moveNumber() {
    return this._moveNumber;
  }
};

// src/variations.js
function moveLabel(fen, san) {
  const [, turn, , , , number] = fen.split(" ");
  return number + (turn === "w" ? ". " : "... ") + san;
}
function lineText(initialFen, moves2) {
  const chess = new Chess(initialFen);
  return moves2.map((san, index) => {
    const label = index === 0 || chess.turn() === "w" ? moveLabel(chess.fen(), san) : san;
    chess.move(san);
    return label;
  }).join(" ");
}
function makeNode(fen, parent, san) {
  return { fen, parent, san, children: [], comment: "" };
}
function addMove2(node2, input) {
  const move3 = new Chess(node2.fen).move(input);
  const existing = node2.children.find((child2) => child2.san === move3.san);
  if (existing) return existing;
  const child = makeNode(move3.after, node2, move3.san);
  node2.children.push(child);
  return child;
}
function readPgn(root, pgn2, strictMain) {
  let node2 = root;
  const returns = [];
  const tokens = pgn2.matchAll(/\[[A-Za-z][A-Za-z0-9_]*\s+"(?:\\.|[^"\\])*"\s*\]|\{[^}]*\}|;[^\r\n]*|[()]|\$\d+|\d+\.+|[^\s{}();\[\]$]+/g);
  for (const [token] of tokens) {
    if (token[0] === "[" || token[0] === "$" || /^\d+\.+$|^\.\.\.$/.test(token)) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      if (!returns.length) break;
      continue;
    }
    if (token === "(") {
      returns.push(node2);
      node2 = node2?.parent ?? node2;
    } else if (token === ")") {
      node2 = returns.pop();
    } else if (node2 && (token[0] === "{" || token[0] === ";")) {
      const comment = token.slice(1, token[0] === "{" ? -1 : void 0).trim();
      if (comment) node2.comment += (node2.comment ? "\n" : "") + comment;
    } else if (node2) {
      try {
        node2 = addMove2(node2, token);
      } catch (error) {
        if (strictMain && !returns.length) throw error;
        node2 = void 0;
      }
    }
  }
  return returns.length ? returns[0] : node2;
}
function pgnMainLine(initialFen, pgn2) {
  return nodeMoves(readPgn(makeNode(initialFen), pgn2, true));
}
function moveTree(doc2) {
  const root = makeNode(doc2.initialFen);
  doc2.moves.reduce(addMove2, root);
  if (doc2.sourcePgn) readPgn(root, doc2.sourcePgn, false);
  for (const line of doc2.variations || []) line.reduce(addMove2, root);
  return root;
}
function nodeMoves(node2) {
  const moves2 = [];
  for (let current = node2; current.parent; current = current.parent) moves2.push(current.san);
  return moves2.reverse();
}

// src/model.js
var APP_VERSION = "3.3.0";
var DEFAULT_FEN = DEFAULT_POSITION;
function positionAt(doc2, cursor = doc2.cursor) {
  const chess = new Chess(doc2.initialFen);
  for (const san of doc2.moves.slice(0, cursor)) chess.move(san);
  return chess;
}
function newDocument() {
  return {
    schema: 1,
    id: "draft",
    title: "Partida sin t\xEDtulo",
    initialFen: DEFAULT_FEN,
    moves: [],
    cursor: 0,
    notes: "",
    orientation: "white",
    depth: 14,
    analyses: {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateDocument(value2) {
  if (!value2 || value2.schema !== 1 || typeof value2.id !== "string" || value2.id.length > 100 || typeof value2.title !== "string" || value2.title.length > 200 || typeof value2.initialFen !== "string" || value2.initialFen.length > 200 || !Array.isArray(value2.moves) || value2.moves.length > 6e3 || value2.moves.some((m) => typeof m !== "string" || m.length > 20) || !Number.isInteger(value2.cursor) || value2.cursor < 0 || value2.cursor > value2.moves.length || typeof value2.notes !== "string" || value2.notes.length > 1e5 || !["white", "black"].includes(value2.orientation)) throw Error("Partida guardada no v\xE1lida.");
  const chess = new Chess(value2.initialFen);
  validateEngineFen(chess.fen());
  for (const move3 of value2.moves) chess.move(move3);
  const variations = [];
  if (Array.isArray(value2.variations)) {
    for (const line of value2.variations.slice(0, 100)) {
      if (!Array.isArray(line) || line.length > 6e3 || line.some((san) => typeof san !== "string" || san.length > 20)) continue;
      try {
        const branch = new Chess(value2.initialFen);
        variations.push(line.map((san) => branch.move(san).san));
      } catch {
      }
    }
  }
  const analyses = {};
  if (value2.analyses && typeof value2.analyses === "object" && !Array.isArray(value2.analyses)) {
    for (const [fen, result] of Object.entries(value2.analyses).slice(-32)) {
      if (fen.length > 200 || !result || result.fen !== fen) continue;
      try {
        validateEngineFen(fen);
      } catch {
        continue;
      }
      const ev = result.evaluation;
      if (!ev || !["cp", "mate"].includes(ev.type) || !Number.isInteger(ev.value) || !Number.isInteger(ev.depth) || !["exact", "lower", "upper"].includes(ev.bound) || !Array.isArray(ev.pv) || ev.pv.length > 100 || ev.pv.some((m) => typeof m !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))) continue;
      const best = result.bestMove;
      if (best !== null && (typeof best !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best))) continue;
      analyses[fen] = { fen, bestMove: best, evaluation: { type: ev.type, value: ev.value, depth: ev.depth, bound: ev.bound, pv: [...ev.pv], nodes: Number(ev.nodes) || 0 } };
    }
  }
  return {
    schema: 1,
    id: value2.id,
    title: value2.title,
    initialFen: value2.initialFen,
    moves: [...value2.moves],
    cursor: value2.cursor,
    notes: value2.notes,
    orientation: value2.orientation,
    ...variations.length ? { variations } : {},
    depth: [10, 12, 14, 16, 18, 20].includes(value2.depth) ? value2.depth : 14,
    analyses,
    ...typeof value2.libraryId === "string" && value2.libraryId.length < 100 ? { libraryId: value2.libraryId } : {},
    ...typeof value2.studyPlayer === "string" && value2.studyPlayer.length <= 200 ? { studyPlayer: value2.studyPlayer } : {},
    ...typeof value2.sourcePgn === "string" && value2.sourcePgn.length <= 2e6 ? { sourcePgn: value2.sourcePgn } : {},
    updatedAt: typeof value2.updatedAt === "string" ? value2.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateEngineFen(fen) {
  if (typeof fen !== "string" || /[\r\n\x00]/.test(fen)) throw Error("FEN no v\xE1lido.");
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6 || !/^\d+$/.test(fields[4]) || !/^\d+$/.test(fields[5]) || +fields[4] > 1e6 || +fields[5] > 1e6) throw Error("Contadores FEN no v\xE1lidos.");
  const chess = new Chess(fen);
  const pieces = chess.board().flat().filter(Boolean);
  for (const color of ["w", "b"]) {
    const side = pieces.filter((p) => p.color === color);
    if (side.length > 16 || side.filter((p) => p.type === "p").length > 8) throw Error("Demasiadas piezas en el FEN.");
  }
  const other = chess.turn() === "w" ? "b" : "w";
  const king2 = pieces.find((p) => p.type === "k" && p.color === other);
  if (!king2 || chess.isAttacked(king2.square, chess.turn())) throw Error("El rey del bando sin turno no puede estar en jaque.");
  for (const [right, ks, rs, color] of [["K", "e1", "h1", "w"], ["Q", "e1", "a1", "w"], ["k", "e8", "h8", "b"], ["q", "e8", "a8", "b"]]) {
    if (fields[2].includes(right) && (chess.get(ks)?.type !== "k" || chess.get(ks)?.color !== color || chess.get(rs)?.type !== "r" || chess.get(rs)?.color !== color)) throw Error("Derecho de enroque incoherente.");
  }
  if (fields[3] !== "-") {
    const ep = fields[3];
    const white = chess.turn() === "w";
    if (!(white ? /^[a-h]6$/ : /^[a-h]3$/).test(ep) || chess.get(ep) || chess.get(ep[0] + (white ? "5" : "4"))?.type !== "p" || chess.get(ep[0] + (white ? "5" : "4"))?.color !== (white ? "b" : "w") || chess.get(ep[0] + (white ? "7" : "2")) || +fields[4] !== 0) throw Error("Captura al paso incoherente.");
  }
  return chess.fen();
}
function pgnHeader(pgn2, name) {
  return (pgn2.match(new RegExp("^\\[" + name + '\\s+"((?:\\\\.|[^"\\\\])*)"\\s*\\]', "m"))?.[1] || "").replace(/\\(["\\])/g, "$1").trim();
}
function importText(text) {
  if (typeof text !== "string" || text.length > 2e6) throw Error("Archivo demasiado grande (m\xE1ximo 2 MB).");
  const doc2 = newDocument(), chess = new Chess();
  if (text.trim().split(/\s+/).length === 6 && /^[prnbqkPRNBQK1-8/]+\s[wb]\s/.test(text.trim())) {
    doc2.initialFen = validateEngineFen(text.trim());
    doc2.title = "Posici\xF3n importada";
    return doc2;
  }
  if ((text.match(/^\[Event\s/gm) || []).length > 1) throw Error("Esta primera versi\xF3n carga una partida PGN cada vez.");
  chess.loadPgn(text);
  const headers = chess.getHeaders();
  doc2.initialFen = headers.FEN || DEFAULT_FEN;
  doc2.moves = chess.history();
  doc2.cursor = doc2.moves.length;
  doc2.sourcePgn = text;
  doc2.title = headers.White && headers.Black ? `${headers.White} \u2014 ${headers.Black}` : "Partida importada";
  return validateDocument(doc2);
}
function exportPgn(doc2) {
  const chess = positionAt(doc2, doc2.moves.length);
  if (doc2.sourcePgn) {
    try {
      if (JSON.stringify(pgnMainLine(doc2.initialFen, doc2.sourcePgn)) === JSON.stringify(doc2.moves)) return doc2.sourcePgn;
    } catch {
    }
  }
  chess.setHeader("Event", doc2.title);
  chess.setHeader("White", "Blancas");
  chess.setHeader("Black", "Negras");
  return chess.pgn({ maxWidth: 80 });
}
function parseBackup(text) {
  if (text.length > 2e7) throw Error("Copia demasiado grande (m\xE1ximo 20 MB).");
  const b = JSON.parse(text);
  if (b.application !== "piolin_chess" || b.schema !== 1 || !Array.isArray(b.games) || b.games.length > 2e3) throw Error("Copia no compatible.");
  const ids = /* @__PURE__ */ new Set();
  const games = b.games.map((g) => {
    const d = validateDocument(g);
    if (d.id === "draft" || ids.has(d.id)) throw Error("Identificadores duplicados en la copia.");
    ids.add(d.id);
    return d;
  });
  const studies = (Array.isArray(b.studies) ? b.studies : []).map((study) => {
    if (!["profile", "rival"].includes(study?.role) || typeof study.player !== "string" || typeof study.name !== "string" || !Array.isArray(study.records) || study.records.some((record) => !Array.isArray(record.findings) || !Array.isArray(record.game?.colors) || !record.game.colors.every((color) => ["w", "b"].includes(color)))) {
      throw Error("La copia contiene un estudio no compatible.");
    }
    return { ...study, id: typeof study.id === "string" && /^study:[a-f0-9-]{36}$/.test(study.id) ? study.id : "study:" + crypto.randomUUID(), records: study.records.map((record) => ({ ...record, game: { ...record.game, doc: validateDocument(record.game.doc) } })) };
  });
  return { games, studies, draft: b.draft ? { ...validateDocument(b.draft), id: "draft" } : newDocument() };
}
function legalDests(chess) {
  const dests = /* @__PURE__ */ new Map();
  for (const m of chess.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    if (!dests.get(m.from).includes(m.to)) dests.get(m.from).push(m.to);
  }
  return dests;
}
function pvToSan(fen, moves2) {
  const game = new Chess(fen), out = [];
  for (const m of moves2.slice(0, 12)) {
    try {
      const before = game.turn(), n = game.moveNumber();
      const played = game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      out.push(`${before === "w" ? n + "." : out.length === 0 ? n + "\u2026" : ""}${played.san}`);
    } catch {
      break;
    }
  }
  return out.join(" ");
}

// src/player-study.js
var rhythms = {
  bullet: "Bala",
  blitz: "Blitz",
  rapid: "R\xE1pidas",
  classical: "Cl\xE1sicas",
  daily: "Por correspondencia",
  unknown: "Ritmo sin identificar"
};
function rhythmFor(pgn2) {
  const explicit = pgnHeader(pgn2, "PiolinRhythm");
  if (explicit !== "unknown" && Object.hasOwn(rhythms, explicit)) return explicit;
  const event = pgnHeader(pgn2, "Event").toLowerCase();
  for (const [key2, pattern] of Object.entries({
    bullet: /\bbullet\b/,
    blitz: /\bblitz\b/,
    rapid: /\brapid\b/,
    classical: /\bclassical\b/,
    daily: /\b(daily|correspondence)\b/
  })) {
    if (pattern.test(event)) return key2;
  }
  const control = pgnHeader(pgn2, "TimeControl");
  if (/^1\/\d+$/.test(control)) return "daily";
  const seconds = control.match(/^(\d+)(?:\+(\d+))?$/);
  if (!seconds) return "unknown";
  const base = Number(seconds[1]), increment = Number(seconds[2] || 0);
  const chesscom = /chess\.com/i.test(pgnHeader(pgn2, "Site"));
  const estimated = base + 40 * increment;
  if (!estimated) return "unknown";
  if (estimated < 180) return "bullet";
  if (estimated < (chesscom ? 600 : 480)) return "blitz";
  if (chesscom) return "rapid";
  if (estimated < 1500) return "rapid";
  return "classical";
}
var playerKey = (name) => name.toLowerCase();
function studyGame(doc2) {
  const pgn2 = doc2.sourcePgn || "";
  const variant = pgnHeader(pgn2, "Variant").toLowerCase();
  if (variant && !["standard", "chess", "from position"].includes(variant)) return null;
  const white = pgnHeader(pgn2, "White"), black = pgnHeader(pgn2, "Black");
  if (!white || !black || white === "?" || black === "?" || !doc2.moves.length) return null;
  const date = [pgnHeader(pgn2, "UTCDate"), pgnHeader(pgn2, "Date")].find((value2) => /^\d{4}\.\d{2}\.\d{2}$/.test(value2)) || "";
  const time = [pgnHeader(pgn2, "UTCTime"), pgnHeader(pgn2, "Time")].find((value2) => /^\d{2}:\d{2}:\d{2}$/.test(value2)) || "";
  const rhythm = rhythmFor(pgn2);
  return {
    doc: doc2,
    white,
    black,
    date,
    time,
    rhythm,
    key: JSON.stringify([playerKey(white), playerKey(black), date, time, doc2.initialFen, doc2.moves])
  };
}
function selectGames(games, player, color, rhythm, limit) {
  const selected = [];
  const seen = /* @__PURE__ */ new Set();
  for (const game of games) {
    const white = playerKey(game.white) === player;
    const black = playerKey(game.black) === player;
    const colors2 = [white && color !== "b" && "w", black && color !== "w" && "b"].filter(Boolean);
    if (!colors2.length || rhythm !== "all" && rhythm !== game.rhythm || seen.has(game.key)) continue;
    seen.add(game.key);
    selected.push({ ...game, colors: colors2 });
  }
  selected.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.doc.updatedAt.localeCompare(a.doc.updatedAt));
  return selected.slice(0, limit);
}
var lessons = {
  mate: {
    title: "T\xE1ctica \xB7 Mate forzado",
    tip: "Antes de decidir, calcula los jaques de ambos bandos. Para cada jaque, comprueba si se puede capturar la pieza, interponer otra o mover el rey."
  },
  material: {
    title: "T\xE1ctica \xB7 P\xE9rdida de material",
    tip: "Despu\xE9s de imaginar tu jugada, busca la captura m\xE1s fuerte del rival. Cuenta qu\xE9 material queda al final de la secuencia e identifica las piezas que quedan sin defensa."
  },
  king: {
    title: "Estrategia \xB7 Rey en el centro al abrirse una columna central",
    tip: "Antes de cambiar peones centrales, compara qu\xE9 rey queda m\xE1s expuesto y qui\xE9n puede ocupar primero la columna. Considera asegurar tu rey antes de abrir el juego."
  },
  development: {
    title: "Estrategia \xB7 Desarrollo pendiente en la apertura",
    tip: "Compara tu jugada con una que saque una pieza menor y mejore la coordinaci\xF3n. Preg\xFAntate qu\xE9 amenaza concreta justifica aplazar el desarrollo."
  },
  other: {
    title: "Otras decisiones para revisar",
    tip: "Busca dos jugadas candidatas y la mejor respuesta rival a cada una. Compara tu c\xE1lculo con la variante del motor para localizar el punto en que cambi\xF3 la posici\xF3n."
  }
};
var value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
var material = (chess, color) => chess.board().flat().reduce((sum, piece) => sum + (piece ? value[piece.type] * (piece.color === color ? 1 : -1) : 0), 0);
function playLine(fen, line) {
  const chess = new Chess(fen);
  for (const move3 of line) {
    try {
      chess.move({ from: move3.slice(0, 2), to: move3.slice(2, 4), promotion: move3[4] });
    } catch {
      break;
    }
  }
  return chess;
}
function score(result, sideToMove, player) {
  const ev = result?.evaluation;
  if (!ev || ev.bound !== "exact") return null;
  const numeric = ev.type === "mate" ? ev.value > 0 ? 1e3 : -1e3 : Math.max(-900, Math.min(900, ev.value));
  return numeric * (sideToMove === player ? 1 : -1);
}
function lossOf(before, after, player) {
  const first = score(before, player, player);
  const second = score(after, player === "w" ? "b" : "w", player);
  return first === null || second === null ? 0 : first - second;
}
function classify(move3, before, after) {
  const color = move3.color;
  const best = playLine(move3.before, before.evaluation.pv.slice(0, 4));
  const reply = playLine(move3.after, after.evaluation.pv.slice(0, 3));
  if (before.evaluation.type !== after.evaluation.type || before.evaluation.type === "mate" && Math.sign(before.evaluation.value) === Math.sign(after.evaluation.value)) {
    if (before.evaluation.type === "mate" || after.evaluation.type === "mate") return "mate";
  }
  const initial2 = new Chess(move3.before);
  if (material(best, color) - material(reply, color) >= 2 && material(initial2, color) - material(reply, color) >= 2) return "material";
  const played = new Chess(move3.after);
  const king2 = played.board().flat().find((piece) => piece?.type === "k" && piece.color === color);
  const openFiles = (chess) => {
    const pawnFiles = new Set(chess.board().flat().filter((piece) => piece?.type === "p").map((piece) => piece.square[0]));
    return Number(!pawnFiles.has("d")) + Number(!pawnFiles.has("e"));
  };
  if (move3.piece === "p" && move3.captured && ["d", "e"].includes(king2?.square[0]) && openFiles(played) > openFiles(initial2)) return "king";
  if (initial2.moveNumber() <= 12) {
    const rank2 = color === "w" ? "1" : "8";
    const waiting = ["b", "c", "f", "g"].filter((file2) => {
      const piece = initial2.get(file2 + rank2);
      return piece?.color === color && ["n", "b"].includes(piece.type);
    });
    if (waiting.length >= 2 && waiting.includes(before.bestMove?.[0]) && before.bestMove[1] === rank2 && !waiting.some((file2) => move3.from === file2 + rank2)) return "development";
  }
  return "other";
}
async function analyzeStudyGame(game, analyze, onProgress, isPaused) {
  const chess = new Chess(game.doc.initialFen);
  const moves2 = game.doc.moves.map((san) => chess.move(san));
  const scans = /* @__PURE__ */ new Map();
  const evaluate = async (fen, depth) => {
    const key2 = depth + " " + fen;
    if (!scans.has(key2)) {
      const position = new Chess(fen);
      const evaluation = position.isCheckmate() ? { type: "mate", value: 0, bound: "exact", pv: [] } : position.isStalemate() || position.isInsufficientMaterial() ? { type: "cp", value: 0, bound: "exact", pv: [] } : null;
      scans.set(key2, evaluation ? { evaluation, bestMove: null } : await analyze(fen, depth));
    }
    return scans.get(key2);
  };
  const findings = [];
  for (let i = 0; i < moves2.length; i++) {
    if (isPaused()) return null;
    const move3 = moves2[i];
    if (!game.colors.includes(move3.color)) continue;
    onProgress(i + 1, moves2.length);
    const first = await evaluate(move3.before, 8);
    const second = await evaluate(move3.after, 8);
    if (lossOf(first, second, move3.color) < 110) continue;
    const before = await evaluate(move3.before, 12);
    const after = await evaluate(move3.after, 12);
    const loss = lossOf(before, after, move3.color);
    if (loss < 125 || !before.bestMove) continue;
    findings.push({
      kind: classify(move3, before, after),
      game: game.doc.title,
      ply: i + 1,
      loss,
      move: move3.san,
      fen: move3.before,
      color: move3.color,
      best: before.bestMove,
      solution: pvToSan(move3.before, before.evaluation.pv),
      replyFen: move3.after,
      replyBest: after.bestMove,
      reply: pvToSan(move3.after, after.evaluation.pv)
    });
  }
  return findings;
}
function summarize(records) {
  const groups = /* @__PURE__ */ new Map();
  for (const record of records) {
    const rhythm = record.game.rhythm;
    if (!groups.has(rhythm)) groups.set(rhythm, []);
    groups.get(rhythm).push(record);
  }
  return [...groups].map(([rhythm, games]) => {
    const patterns = Object.keys(lessons).map((kind) => {
      const examples = games.flatMap((game) => game.findings.filter((event) => event.kind === kind));
      const has = (game) => game.findings.some((event) => event.kind === kind);
      const recent = games.slice(0, 10), prior = games.slice(10);
      const ranked = [...examples].sort((a, b) => b.loss - a.loss);
      const distinct = /* @__PURE__ */ new Map();
      for (const example2 of ranked) {
        const position = example2.fen.split(" ").slice(0, 4).join(" ");
        if (!distinct.has(position)) distinct.set(position, example2);
        if (distinct.size === 3) break;
      }
      return {
        kind,
        count: games.filter(has).length,
        total: examples.length,
        examples: [...distinct.values()],
        impact: examples.reduce((sum, example2) => sum + example2.loss, 0),
        recent: recent.filter(has).length,
        prior: prior.filter(has).length,
        priorTotal: prior.length
      };
    }).filter((pattern) => pattern.total).sort((a, b) => b.count - a.count || b.impact - a.impact);
    return {
      rhythm,
      count: games.length,
      patterns: patterns.slice(0, 3),
      chronological: games.every(({ game }) => Boolean(game.date))
    };
  });
}
var positionKey = (fen) => fen.split(" ").slice(0, 4).join(" ");
function openingBook(games, color) {
  const book = /* @__PURE__ */ new Map();
  for (const game of games.filter((game2) => game2.colors.includes(color))) {
    const chess = new Chess(game.doc.initialFen);
    if (chess.fen() !== new Chess().fen()) continue;
    const seen = /* @__PURE__ */ new Set();
    for (const san of game.doc.moves.slice(0, 16)) {
      const fen = positionKey(chess.fen());
      const move3 = chess.move(san);
      if (move3.color !== color || seen.has(fen)) continue;
      seen.add(fen);
      if (!book.has(fen)) book.set(fen, /* @__PURE__ */ new Map());
      const choices = book.get(fen);
      choices.set(move3.san, (choices.get(move3.san) || 0) + 1);
    }
  }
  return book;
}
async function prepareOpening(games, repertoire, ownColor, analyze) {
  const opponent = openingBook(games, ownColor === "w" ? "b" : "w");
  const own = openingBook(repertoire, ownColor);
  const ranked = (book, chess) => [...book.get(positionKey(chess.fen())) || []].sort((a, b) => b[1] - a[1]);
  const root = new Chess();
  if (!games.some((game) => new Chess(game.doc.initialFen).fen() === root.fen())) return [];
  const choose = async (chess) => {
    const familiar = ranked(own, chess)[0];
    const result = await analyze(chess.fen(), 12);
    if (!result.bestMove) return null;
    const line = pvToSan(chess.fen(), result.evaluation.pv);
    const best = playLine(chess.fen(), [result.bestMove]).history()[0];
    return { san: familiar?.[0] || best, familiar: familiar?.[1] || 0, best, line };
  };
  const first = ownColor === "w" ? await choose(root) : null;
  if (first) root.move(first.san);
  const observed = ranked(opponent, root);
  const total = observed.reduce((sum, [, count]) => sum + count, 0);
  const plans = [];
  for (const [move3, count] of observed.slice(0, 3)) {
    const chess = new Chess(root.fen());
    chess.move(move3);
    const response = await choose(chess);
    if (!response) continue;
    chess.move(response.san);
    const followups = ranked(opponent, chess).slice(0, 2).map(([reply, frequency]) => ({
      reply,
      frequency
    }));
    let alternate;
    if (followups.length) {
      const reply = (followups[1] || followups[0]).reply;
      chess.move(reply);
      const continuation = await choose(chess);
      if (continuation) alternate = { reply, response: continuation };
    }
    plans.push({ first, move: move3, count, total, response, followups, alternate });
  }
  if (!plans.length && first) plans.push({ first, followups: [] });
  return plans;
}

// src/engine.js
function parseInfo(line) {
  if (!line.startsWith("info ") || line.startsWith("info string ")) return null;
  const tokens = line.trim().split(/\s+/), pv = tokens.indexOf("pv");
  const head = pv < 0 ? tokens : tokens.slice(0, pv);
  const score2 = head.indexOf("score"), depth = head.indexOf("depth");
  if (score2 < 0 || depth < 0) return null;
  const type = head[score2 + 1], value2 = Number(head[score2 + 2]), d = Number(head[depth + 1]);
  if (!["cp", "mate"].includes(type) || !Number.isInteger(value2) || !Number.isInteger(d)) return null;
  const mp = head.indexOf("multipv");
  if (mp >= 0 && head[mp + 1] !== "1") return null;
  return { type, value: value2, depth: d, bound: head.includes("lowerbound") ? "lower" : head.includes("upperbound") ? "upper" : "exact", pv: pv < 0 ? [] : tokens.slice(pv + 1), nodes: Number(head[head.indexOf("nodes") + 1]) || 0 };
}
var LocalEngine = class {
  constructor({ workerFactory = (url2) => new Worker(url2), onStatus = () => {
  }, url = "engine/stockfish-19-lite-single.js", label = "Stockfish 19 lite", options = { Hash: 32 } } = {}) {
    this.workerFactory = workerFactory;
    this.onStatus = onStatus;
    this.url = url;
    this.label = label;
    this.options = options;
    this.ready = false;
    this.cancelEpoch = 0;
    this.waiters = /* @__PURE__ */ new Set();
    this.search = null;
    this.dead = false;
  }
  async init() {
    if (this.ready) return;
    if (this.initializing) return this.initializing;
    this.initializing = this._init();
    return this.initializing;
  }
  async _init() {
    if (this.dead) throw Error("El motor est\xE1 cerrado. Recarga la aplicaci\xF3n.");
    this.onStatus("Cargando " + this.label + "\u2026");
    this.worker = this.workerFactory(this.url);
    this.worker.onmessage = (event) => {
      for (const line of String(event.data).split(/[\r\n]+/)) this._line(line.trim());
    };
    this.worker.onerror = () => this._fail(Error("No se pudo ejecutar Stockfish. Comprueba que arrancaste desde el servidor local y que el dispositivo tiene memoria disponible."));
    try {
      await this._command("uci", "uciok", 12e4);
      for (const [name, value2] of Object.entries(this.options)) this.setOption(name, value2);
      this.send("setoption name MultiPV value 1");
      this.send("setoption name UCI_Chess960 value false");
      await this._command("isready", "readyok", 3e4);
      this.ready = true;
      this.onStatus(this.label + " \xB7 preparado");
    } catch (e) {
      this._fail(e);
      throw e;
    }
  }
  setOption(name, value2) {
    if (!/^[A-Za-z ]+$/.test(name) || !/^[\w.-]+$/.test(String(value2))) throw Error("Opci\xF3n UCI no v\xE1lida.");
    this.send("setoption name " + name + " value " + value2);
  }
  send(command) {
    if (this.dead || !this.worker) throw Error("El motor no est\xE1 disponible.");
    this.worker.postMessage(command);
  }
  _command(command, expected, ms) {
    return new Promise((resolve, reject) => {
      const waiter = { expected, resolve: () => {
        clearTimeout(waiter.timer);
        this.waiters.delete(waiter);
        resolve();
      }, reject: (e) => {
        clearTimeout(waiter.timer);
        this.waiters.delete(waiter);
        reject(e);
      } };
      waiter.timer = setTimeout(() => {
        const error = Error("Stockfish no respondi\xF3 a tiempo (" + expected + ").");
        this._fail(error);
      }, ms);
      this.waiters.add(waiter);
      try {
        this.send(command);
      } catch (e) {
        waiter.reject(e);
      }
    });
  }
  async analyze(fen, depth = 14, onInfo = () => {
  }) {
    if (!Number.isInteger(depth) || depth < 1 || depth > 30) throw Error("Profundidad no v\xE1lida.");
    if (/[\r\n\x00]/.test(fen)) throw Error("FEN no v\xE1lido.");
    const epoch = this.cancelEpoch;
    await this.init();
    const canceled = () => {
      if (epoch !== this.cancelEpoch) {
        const e = Error("An\xE1lisis cancelado.");
        e.name = "AbortError";
        throw e;
      }
    };
    canceled();
    if (this.search || this.preparing) throw Error("Ya hay un an\xE1lisis en curso.");
    this.preparing = true;
    try {
      await this._command("isready", "readyok", 1e4);
    } finally {
      this.preparing = false;
    }
    canceled();
    return new Promise((resolve, reject) => {
      const search = { resolve, reject, onInfo, fen, latest: null, timer: null, stopTimer: null };
      search.timer = setTimeout(() => this._fail(Error("El an\xE1lisis ha excedido dos minutos. Reduce la profundidad y recarga el motor.")), 12e4);
      this.search = search;
      try {
        this.send("position fen " + fen);
        this.send("go depth " + depth);
      } catch (e) {
        this._fail(e);
      }
    });
  }
  _line(line) {
    if (this.dead) return;
    for (const waiter of [...this.waiters]) if (line === waiter.expected) waiter.resolve();
    const s = this.search;
    if (!s) return;
    const info = parseInfo(line);
    if (info && (!s.latest || info.depth >= s.latest.depth)) {
      s.latest = info;
      s.onInfo(info);
    }
    if (line.startsWith("bestmove ")) {
      const token = line.split(/\s+/)[1];
      if (!/^(?:[a-h][1-8][a-h][1-8][qrbn]?|0000|\(none\))$/.test(token)) {
        this._fail(Error("Respuesta UCI bestmove inv\xE1lida."));
        return;
      }
      clearTimeout(s.timer);
      clearTimeout(s.stopTimer);
      this.search = null;
      s.resolve({ fen: s.fen, evaluation: s.latest, bestMove: ["0000", "(none)"].includes(token) ? null : token });
    }
  }
  stop() {
    this.cancelEpoch++;
    const s = this.search;
    if (!s) return Promise.resolve();
    if (!s.stopTimer) {
      s.stopTimer = setTimeout(() => this._fail(Error("El motor no responde a la pausa. Recarga para reiniciarlo.")), 5e3);
      try {
        this.send("stop");
      } catch (e) {
        this._fail(e);
      }
    }
    return new Promise((resolve) => {
      const success = s.resolve, failure = s.reject;
      s.resolve = (v) => {
        success(v);
        resolve();
      };
      s.reject = (e) => {
        failure(e);
        resolve();
      };
    });
  }
  _fail(error) {
    if (this.dead) return;
    this.dead = true;
    this.ready = false;
    this.onStatus(error.message);
    for (const waiter of [...this.waiters]) waiter.reject(error);
    if (this.search) {
      const s = this.search;
      this.search = null;
      clearTimeout(s.timer);
      clearTimeout(s.stopTimer);
      s.reject(error);
    }
    this.worker?.terminate();
  }
  destroy() {
    if (!this.dead) {
      try {
        this.worker?.postMessage("quit");
      } catch {
      }
      this._fail(Error("Motor cerrado."));
    }
  }
};

// src/opening-traps.js
var entries = [
  {
    name: "Gambito Evans",
    kind: "gambit",
    prefix: "e4 e5 Nf3 Nc6 Bc4 Bc5",
    offer: "b4",
    response: "Bxb4",
    follow: "c3 Ba5 d4",
    defense: "Bb6",
    safe: "a4",
    idea: "Cede el pe\xF3n de b para ganar tiempos contra el alfil y ocupar el centro con d4."
  },
  {
    name: "Gambito dan\xE9s",
    kind: "gambit",
    prefix: "e4 e5 d4 exd4",
    offer: "c3",
    response: "dxc3",
    follow: "Bc4 cxb2 Bxb2",
    defense: "d5",
    safe: "exd5",
    idea: "Si aceptan los peones, activa los alfiles. Ante \u2026d5, calcula el cambio central de inmediato."
  },
  {
    name: "Gambito Smith-Morra",
    kind: "gambit",
    prefix: "e4 c5 d4 cxd4",
    offer: "c3",
    response: "dxc3",
    follow: "Nxc3 Nc6 Nf3",
    defense: "Nf6",
    safe: "e5",
    idea: "Entr\xE9gale un pe\xF3n a la Siciliana para desarrollar con rapidez y usar las columnas c y d."
  },
  {
    name: "Gambito escoc\xE9s",
    kind: "gambit",
    prefix: "e4 e5 Nf3 Nc6 d4 exd4",
    offer: "Bc4",
    response: "Bc5",
    follow: "c3 Nf6 O-O",
    defense: "Nf6",
    safe: "e5",
    idea: "Desarrolla el alfil hacia f7 y prepara c3 para recuperar espacio en el centro."
  },
  {
    name: "Trampa Milner-Barry en la Francesa",
    kind: "trap",
    prefix: "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4",
    offer: "cxd4",
    response: "Nxd4",
    follow: "Nxd4 Qxd4 Bb5+ Bd7 Qxd4",
    defense: "Bd7",
    safe: "O-O",
    idea: "Si el rival captura en d4 y despu\xE9s recaptura con la dama, Ab5+ despeja la columna y permite tomar la dama negra tras responder al jaque."
  },
  {
    name: "Trampa de Legal",
    kind: "trap",
    prefix: "e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5",
    offer: "Nxe5",
    response: "Bxd1",
    follow: "Bxf7+ Ke7 Nd5#",
    defense: "Nxe5",
    safe: "Qxh5",
    idea: "La captura de dama permite mate. Si recapturan con el caballo, toma el alfil de h5."
  },
  {
    name: "Gambito Budapest",
    kind: "gambit",
    prefix: "d4 Nf6 c4",
    offer: "e5",
    response: "dxe5",
    follow: "Ng4 Nf3 Nc6",
    defense: "e3",
    safe: "exd4 exd4 d5",
    idea: "Disputa e5 con el caballo y desarrolla las piezas. La captura blanca es una respuesta normal."
  },
  {
    name: "Trampa del Budapest",
    kind: "trap",
    prefix: "d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3",
    offer: "Ngxe5",
    response: "axb4",
    follow: "Nd3#",
    defense: "Nxe5",
    safe: "Nxe5",
    idea: "El pe\xF3n de e2 est\xE1 clavado por la dama. Si las blancas toman en b4, el caballo da mate en d3."
  },
  {
    name: "Contragambito Albin",
    kind: "gambit",
    prefix: "d4 d5 c4",
    offer: "e5",
    response: "dxe5",
    follow: "d4 Nf3 Nc6",
    defense: "cxd5",
    safe: "exd4",
    idea: "Avanza el pe\xF3n a d4 si aceptan el gambito y gana espacio para desarrollar las piezas."
  },
  {
    name: "Trampa de Lasker en el Albin",
    kind: "trap",
    prefix: "d4 d5 c4 e5 dxe5 d4 e3",
    offer: "Bb4+",
    response: "Bd2",
    follow: "dxe3 Bxb4 exf2+ Ke2 fxg1=N+",
    defense: "Nd2",
    safe: "dxe3 fxe3 Nc6",
    idea: "Si las blancas interponen el alfil, el pe\xF3n puede capturar en g1 con promoci\xF3n a caballo y jaque en la l\xEDnea mostrada."
  },
  {
    name: "Trampa de Blackburne",
    kind: "trap",
    prefix: "e4 e5 Nf3 Nc6 Bc4",
    offer: "Nd4",
    response: "Nxe5",
    follow: "Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#",
    defense: "Nxd4",
    safe: "exd4 O-O",
    idea: "Si capturan en e5, ataca g2 con la dama. El mate requiere que las blancas tambi\xE9n se equivoquen despu\xE9s. \u2026Cd4 permite una respuesta fuerte en d4."
  }
];
var moves = (text) => text.split(" ");
var key = (fen) => fen.split(" ").slice(0, 4).join(" ");
var openingTraps = entries.map((entry) => {
  const game = new Chess();
  for (const san of moves(entry.prefix)) game.move(san);
  const fen = game.fen(), color = game.turn();
  const offer = game.move(entry.offer);
  const afterOffer = game.fen();
  const reply = game.move(entry.response);
  return {
    ...entry,
    fen,
    color,
    ply: game.history().length - 2,
    key: key(fen),
    afterKey: key(afterOffer),
    label: moveLabel(fen, offer.san),
    response: reply.san,
    example: lineText(fen, [entry.offer, reply.san, ...moves(entry.follow)]),
    precaution: lineText(afterOffer, [entry.defense, ...moves(entry.safe)]),
    lines: [[entry.offer, reply.san, ...moves(entry.follow)], [entry.offer, entry.defense, ...moves(entry.safe)]]
  };
});
function trapMatches(games, color) {
  const candidates = openingTraps.filter((trap) => trap.color === color);
  const positions = /* @__PURE__ */ new Map(), responses = /* @__PURE__ */ new Map();
  for (const { doc: doc2 } of games) {
    const game = new Chess(doc2.initialFen);
    const reached = /* @__PURE__ */ new Set();
    const answers = /* @__PURE__ */ new Map();
    for (let index = 0; index <= Math.min(doc2.moves.length, 40); index++) {
      const current = key(game.fen());
      reached.add(current);
      if (!doc2.moves[index]) break;
      if (!answers.has(current)) answers.set(current, doc2.moves[index]);
      game.move(doc2.moves[index]);
    }
    for (const trap of candidates) {
      if (reached.has(trap.key)) positions.set(trap, (positions.get(trap) || 0) + 1);
      const response = answers.get(trap.afterKey);
      if (!response) continue;
      const counts = responses.get(trap) || { seen: 0, matched: 0 };
      counts.seen++;
      if (response === trap.response) counts.matched++;
      responses.set(trap, counts);
    }
  }
  return candidates.flatMap((trap) => {
    const reached = positions.get(trap) || 0;
    const { seen, matched } = responses.get(trap) || { seen: 0, matched: 0 };
    return reached || seen ? [{ trap, reached, seen, matched }] : [];
  }).sort((a, b) => b.matched - a.matched || b.reached - a.reached);
}
function trapDocument(trap) {
  return {
    title: trap.name,
    initialFen: DEFAULT_FEN,
    orientation: trap.color === "w" ? "white" : "black",
    moves: [...moves(trap.prefix), ...trap.lines[0]],
    variations: [[...moves(trap.prefix), ...trap.lines[1]]]
  };
}
function trapCard(trap, practice, summary) {
  const section = document.createElement("section");
  section.className = "study-group";
  const title = document.createElement("h4");
  title.textContent = trap.name + " \xB7 " + (trap.color === "w" ? "Blancas" : "Negras");
  section.append(title);
  for (const text of [
    summary,
    "Juega " + trap.label + ". " + trap.idea,
    (trap.kind === "trap" ? "Si cae: " : "Si sigue esta l\xEDnea: ") + trap.example,
    "Si evita esa l\xEDnea: " + trap.precaution
  ]) {
    if (!text) continue;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    section.append(paragraph);
  }
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Practicar en el tablero";
  button.addEventListener("click", () => practice(trapDocument(trap), trap.ply));
  section.append(button);
  return section;
}

// src/study-view.js
var $ = (id) => document.getElementById(id);
function setupStudy({ load, save, showError: showError2, openPractice: openPractice2 }) {
  const dialog = $("study-dialog"), form = $("study-form"), player = $("study-player");
  const start5 = $("study-start"), pause = $("study-pause"), status = $("study-status");
  const progress = $("study-progress"), results = $("study-results");
  const onlyBatch = $("study-only-batch"), role = $("study-role"), single = $("study-single");
  const color = $("study-color"), rhythm = $("study-rhythm"), limit = $("study-limit");
  const saveButton = $("study-save");
  const filters = [player, role, rhythm, color, limit, onlyBatch, single];
  const exercise = $("study-exercise"), replay = $("study-replay");
  let replayBoard, replayGame, replayPly;
  function renderReplay() {
    const { doc: doc2, colors: colors2 } = replayGame;
    const chess = positionAt(doc2, replayPly);
    replayBoard.set({
      fen: chess.fen(),
      orientation: colors2[0] === "b" ? "black" : "white",
      check: chess.inCheck()
    });
    $("study-replay-move").textContent = replayPly ? moveLabel(positionAt(doc2, replayPly - 1).fen(), doc2.moves[replayPly - 1]) : "Posici\xF3n inicial";
    $("study-replay-prev").disabled = replayPly === 0;
    $("study-replay-next").disabled = replayPly === doc2.moves.length;
  }
  $("study-replay-prev").addEventListener("click", () => {
    replayPly--;
    renderReplay();
  });
  $("study-replay-next").addEventListener("click", () => {
    replayPly++;
    renderReplay();
  });
  $("explore-replay").addEventListener("click", () => {
    const orientation = replayGame.colors[0] === "b" ? "black" : "white";
    openPractice2({ ...replayGame.doc, orientation }, replayPly);
  });
  function openReplay(game) {
    replayGame = game;
    replayPly = 0;
    $("study-replay-title").textContent = `${game.white} \u2013 ${game.black}`;
    replay.showModal();
    replayBoard ||= Chessground($("study-replay-board"), { viewOnly: true, drawable: { enabled: false } });
    renderReplay();
  }
  let library = [], batch, profiles, skipped, job, engine2, board2, position, example2, solved, running;
  async function open({ preferredPlayer = "", games, saved, skipped: omitted = 0 } = {}) {
    if (dialog.open || running) return;
    const entries2 = await load();
    profiles = entries2.filter((entry) => entry.role === "profile");
    library = entries2.filter((entry) => !entry.role).map(studyGame).filter(Boolean);
    batch = games?.map(studyGame) || saved?.records.map((record) => record.game);
    skipped = omitted;
    const users = /* @__PURE__ */ new Map();
    for (const game of batch || library) {
      for (const name of [game.white, game.black]) users.set(playerKey(name), name);
    }
    const selected = playerKey(preferredPlayer);
    player.replaceChildren(...[...users].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([key2, name]) => new Option(name, key2)));
    if (users.has(selected)) player.value = selected;
    $("study-scope").hidden = !batch;
    onlyBatch.checked = Boolean(batch);
    rhythm.value = saved?.rhythm || "all";
    role.value = saved?.role || "";
    setColorOptions(saved?.color);
    limit.value = "all";
    single.value = "";
    job = void 0;
    updateSelection();
    if (saved) {
      job = { ...saved, key: selectionKey(selection()), saved: true };
      renderReport();
      progress.hidden = false;
      showProgress(saved.records.length, saved.records.length, "Estudio guardado.");
      start5.textContent = "Analizar de nuevo";
      $("study-exit").textContent = "Cerrar estudio";
    }
    dialog.showModal();
  }
  function setColorOptions(value2) {
    const rival = role.value === "rival";
    $("study-color-label").textContent = rival ? "Jugar\xE9 con" : "Color del jugador";
    const options = rival ? [] : [new Option("Ambos", "all")];
    color.replaceChildren(...options, new Option("Blancas", "w"), new Option("Negras", "b"));
    if (value2 && [...color.options].some((option) => option.value === value2)) color.value = value2;
  }
  function selection(individual = true) {
    const candidates = batch ? onlyBatch.checked ? batch : [...batch, ...library] : library;
    const side = role.value === "rival" ? color.value === "w" ? "b" : "w" : color.value;
    const games = selectGames(candidates, player.value, side, rhythm.value, Number(limit.value) || Infinity);
    return individual && single.value ? games.filter((game) => game.key === single.value) : games;
  }
  const selectionKey = (games) => JSON.stringify([
    role.value,
    player.value,
    color.value,
    games.map((game) => [game.key, game.colors])
  ]);
  function updateSelection() {
    const selected = single.value, available = selection(false);
    single.replaceChildren(new Option("Conjunto de partidas", ""), ...available.map((game) => new Option(`${game.white} \u2013 ${game.black} \xB7 ${game.date || "Sin fecha"} \xB7 ${game.colors[0] === "w" ? "Blancas" : "Negras"}`, game.key)));
    if (available.some((game) => game.key === selected)) single.value = selected;
    const games = selection();
    if (job?.key !== selectionKey(games)) job = void 0;
    status.textContent = games.length ? `${games.length} partidas seleccionadas.${skipped ? ` ${skipped} PGN omitidos.` : ""}` : "No hay partidas con jugador y jugadas para esos filtros.";
    progress.hidden = !job;
    if (job) showProgress(job.records.length, games.length);
    results.replaceChildren();
    if (job?.records.length) renderReport();
    start5.disabled = !role.value || !games.length;
    start5.textContent = !job ? "Analizar partidas" : job.records.length < games.length ? "Continuar an\xE1lisis" : "Analizar de nuevo";
    updateSave();
  }
  function updateSave() {
    saveButton.hidden = !job?.records.length || Boolean(job.saved);
    $("study-exit").textContent = job?.saved ? "Cerrar estudio" : "Salir sin guardar";
  }
  saveButton.addEventListener("click", async () => {
    if (running || !job?.records.length || job.saved) return;
    const current = job;
    saveButton.disabled = true;
    try {
      const { role: role2, player: player2, name, records, plans, color: color2, rhythm: rhythm2 } = current;
      await save({
        id: "study:" + crypto.randomUUID(),
        role: role2,
        player: player2,
        name,
        records,
        plans,
        color: color2,
        rhythm: rhythm2,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      current.saved = true;
      if (job === current) {
        updateSave();
        status.textContent = "Estudio guardado en la biblioteca.";
      }
    } catch (error) {
      showError2(error);
    } finally {
      saveButton.disabled = false;
    }
  });
  function showProgress(done, total, detail = "") {
    progress.max = total;
    progress.value = done;
    status.textContent = `${done} de ${total} partidas analizadas.${detail ? " " + detail : ""}`;
  }
  function renderReport() {
    results.replaceChildren();
    const note = document.createElement("p");
    note.textContent = "Estimaci\xF3n de Stockfish. Los patrones estrat\xE9gicos son pistas para revisar. Las comparaciones usan partidas del mismo ritmo; si falta la fecha PGN, ese grupo no muestra evoluci\xF3n.";
    results.append(note);
    const rival = job.role === "rival";
    if (rival) renderPreparation();
    const evidence = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `Partidas analizadas (${job.records.length})`;
    evidence.append(summary);
    for (const { game, findings } of job.records) {
      const line = document.createElement("p");
      line.textContent = `${game.white} \u2013 ${game.black} \xB7 ${game.colors.map((side) => side === "w" ? "Blancas" : "Negras").join(" y ")} \xB7 ${rhythms[game.rhythm]} \xB7 ${findings.length} posiciones detectadas`;
      const replayButton = document.createElement("button");
      replayButton.type = "button";
      replayButton.textContent = "Reproducir partida";
      replayButton.addEventListener("click", () => openReplay(game));
      line.append(" ", replayButton);
      evidence.append(line);
    }
    results.append(evidence);
    for (const group of summarize(job.records)) {
      const section = document.createElement("section");
      section.className = "study-group";
      const title = document.createElement("h3");
      title.textContent = `${rhythms[group.rhythm]} \xB7 ${group.count} partidas`;
      section.append(title);
      if (!group.patterns.length) {
        const empty = document.createElement("p");
        empty.textContent = "El an\xE1lisis no encontr\xF3 p\xE9rdidas de evaluaci\xF3n suficientemente claras.";
        section.append(empty);
      }
      for (const pattern of group.patterns) {
        const lesson = lessons[pattern.kind], heading = document.createElement("h4");
        heading.textContent = rival ? "Debilidad observada \xB7 " + lesson.title : lesson.title;
        const stats = document.createElement("p");
        stats.textContent = `${pattern.count} de ${group.count} partidas \xB7 ${pattern.total} casos.`;
        if (pattern.priorTotal && group.chronological && group.rhythm !== "unknown") {
          stats.textContent += ` \xDAltimas 10: ${pattern.recent}/10. Anteriores: ${pattern.prior}/${pattern.priorTotal}.`;
        }
        const tip = document.createElement("p");
        tip.textContent = rival ? {
          mate: "Cuando el rey quede expuesto, calcula jaques y amenazas de mate.",
          material: "Busca capturas forzadas y piezas indefensas al calcular la respuesta.",
          king: "Comprueba si puedes abrir una columna central antes de que el rival asegure su rey.",
          development: "Considera abrir el centro cuando tus piezas est\xE9n mejor desarrolladas.",
          other: "Revisa la continuaci\xF3n concreta y comprueba si la ventaja se mantiene ante la mejor defensa."
        }[pattern.kind] : lesson.tip;
        section.append(heading, stats, tip);
        for (const event of pattern.examples) {
          const button = document.createElement("button");
          button.type = "button";
          if (rival && !event.replyBest) continue;
          const exerciseEvent = rival ? {
            ...event,
            fen: event.replyFen,
            best: event.replyBest,
            color: event.color === "w" ? "b" : "w",
            solution: event.reply,
            reply: "",
            afterRivalMove: true
          } : event;
          const number = event.fen.split(" ")[5];
          button.textContent = `${event.game} \xB7 jugada ${number} con ${event.color === "w" ? "blancas" : "negras"}`;
          button.addEventListener("click", () => openExercise(exerciseEvent));
          section.append(button);
        }
      }
      results.append(section);
    }
  }
  function renderPreparation() {
    const title = document.createElement("h3");
    title.textContent = `Preparaci\xF3n con ${job.color === "w" ? "blancas" : "negras"}`;
    const opening = document.createElement("p");
    opening.textContent = "Las frecuencias se calculan a partir de las partidas analizadas que alcanzaron cada posici\xF3n. Las jugadas de repertorio proceden de los estudios guardados en Mi perfil. Tambi\xE9n se muestra la primera opci\xF3n de Stockfish para comparar.";
    results.append(title, opening);
    for (const plan of job.plans || []) {
      const line = document.createElement("p");
      const describe = (choice) => choice.familiar ? `${choice.san} (repertorio, ${choice.familiar} partidas; Stockfish: ${choice.best})` : `${choice.san} (Stockfish)`;
      const beginning = plan.first ? `Empieza con ${describe(plan.first)}. ` : "";
      if (plan.response) {
        line.textContent = `${beginning}Si juega ${plan.move} (${plan.count}/${plan.total}), prepara ${describe(plan.response)}.`;
        if (plan.response.line) line.textContent += ` Variante del motor: ${plan.response.line}.`;
        if (plan.followups.length) line.textContent += " Continuaciones vistas: " + plan.followups.map(({ reply, frequency }) => `${reply} (${frequency})`).join(", ") + ".";
        if (plan.alternate) line.textContent += ` Ante ${plan.alternate.reply}, considera ${describe(plan.alternate.response)}.`;
      } else {
        line.textContent = beginning + "La muestra no recoge respuestas del rival a esta salida.";
      }
      results.append(line);
    }
    if (!job.plans?.length) {
      const empty = document.createElement("p");
      empty.textContent = "Todav\xEDa no hay una muestra de apertura para este color.";
      results.append(empty);
    }
    const heading = document.createElement("h3");
    heading.textContent = "Gambitos y trampas para este rival";
    results.append(heading);
    const matches = trapMatches(job.records.map((record) => record.game), job.color);
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = "Las partidas analizadas a\xFAn no muestran posiciones que coincidan con el cat\xE1logo.";
      results.append(empty);
    }
    for (const { trap, reached, seen, matched } of matches) {
      const evidence = `Posici\xF3n para jugar ${trap.label}: ${reached} de ${job.records.length} partidas. ` + (seen ? `El rival respondi\xF3 ${trap.response} en ${matched} de ${seen} partidas que llegaron al turno de respuesta.` : "La muestra no recoge una respuesta del rival despu\xE9s de esa jugada.");
      results.append(trapCard(trap, openPractice2, evidence));
    }
  }
  function renderExercise() {
    const orientation = example2.color === "w" ? "white" : "black";
    board2.set({
      fen: position.fen(),
      orientation,
      check: position.inCheck(),
      lastMove: void 0,
      turnColor: position.turn() === "w" ? "white" : "black",
      movable: { free: false, color: solved ? void 0 : orientation, dests: legalDests(position) }
    });
  }
  function openExercise(event) {
    example2 = event;
    exercise.showModal();
    if (!board2) {
      board2 = Chessground($("study-board"), {
        coordinates: true,
        drawable: { enabled: false },
        premovable: { enabled: false },
        movable: { events: { after: (from, to) => {
          const candidates = position.moves({ verbose: true }).filter((move4) => move4.from === from && move4.to === to);
          if (!candidates.length || solved) return;
          if (candidates.some((move4) => move4.promotion)) {
            $("study-exercise-feedback").textContent = "Puedes consultar la variante del motor para ver la pieza de promoci\xF3n.";
            renderExercise();
            return;
          }
          const move3 = position.move({ from, to });
          solved = true;
          $("study-exercise-feedback").textContent = move3.lan === example2.best ? `${move3.san}: coincide con la primera opci\xF3n de Stockfish.` : `Has probado ${move3.san}. Consulta la variante del motor para comparar las ideas.`;
          renderExercise();
        } } }
      });
    }
    resetExercise();
  }
  function resetExercise() {
    position = new Chess(example2.fen);
    solved = false;
    $("study-exercise-title").textContent = example2.game;
    const name = player.selectedOptions[0]?.text || "";
    const color2 = example2.color === "w" ? "blancas" : "negras";
    const feedback = $("study-exercise-feedback");
    feedback.textContent = example2.afterRivalMove ? `Tu rival acaba de jugar ${example2.move}. Juegas con ${color2}. Encuentra c\xF3mo responder.` : name + " juega con " + color2 + ". Encuentra una continuaci\xF3n.";
    const solution = $("study-exercise-solution");
    solution.hidden = true;
    solution.textContent = "";
    renderExercise();
  }
  $("explore-exercise").addEventListener("click", () => {
    const chess = new Chess(example2.fen);
    const moves2 = [];
    if (solved) {
      moves2.push(...position.history());
    } else if (!$("study-exercise-solution").hidden && example2.best) {
      const { best } = example2;
      const move3 = chess.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
      moves2.push(move3.san);
    }
    openPractice2({
      title: example2.game,
      initialFen: example2.fen,
      orientation: example2.color === "w" ? "white" : "black",
      moves: moves2
    }, solved ? moves2.length : 0);
  });
  $("study-exercise-reset").addEventListener("click", resetExercise);
  $("study-exercise-reveal").addEventListener("click", () => {
    const solution = $("study-exercise-solution");
    solution.textContent = `En la partida: ${example2.move}${example2.reply ? " \xB7 Respuesta y continuaci\xF3n: " + example2.reply : ""}. Sugerencia de Stockfish: ${example2.solution || pvToSan(example2.fen, [example2.best])}.`;
    solution.hidden = false;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (running || !role.value) return;
    const games = selection();
    if (!games.length) return;
    if (!job || job.records.length === games.length) {
      job = {
        key: selectionKey(games),
        player: player.value,
        name: player.selectedOptions[0].text,
        role: role.value,
        color: color.value,
        rhythm: rhythm.value,
        records: []
      };
    }
    const worker = new LocalEngine({ options: { Hash: 16 } });
    engine2 = worker;
    running = true;
    saveButton.hidden = true;
    start5.disabled = true;
    pause.disabled = false;
    for (const filter of filters) filter.disabled = true;
    results.replaceChildren();
    progress.hidden = false;
    showProgress(job.records.length, games.length, "Preparando Stockfish\u2026");
    let message = "";
    try {
      for (const game of games.slice(job.records.length)) {
        if (engine2 !== worker) break;
        const findings = await analyzeStudyGame(
          game,
          (fen, depth) => worker.analyze(fen, depth),
          (ply, total) => {
            if (ply <= 2 || ply % 12 < 2) showProgress(job.records.length, games.length, `Posici\xF3n ${ply} de ${total}.`);
          },
          () => engine2 !== worker
        );
        if (!findings || engine2 !== worker) break;
        job.records.push({ game, findings });
        showProgress(job.records.length, games.length);
      }
      if (job.role === "rival" && engine2 === worker) {
        showProgress(job.records.length, games.length, "Preparando aperturas\u2026");
        const seen = /* @__PURE__ */ new Set();
        const repertoire = profiles.flatMap((profile) => profile.records.map((record) => record.game)).filter((game) => {
          const key2 = JSON.stringify([game.key, game.colors]);
          if (seen.has(key2)) return false;
          seen.add(key2);
          return true;
        });
        job.plans = await prepareOpening(
          job.records.map((record) => record.game),
          repertoire,
          job.color,
          (fen, depth) => worker.analyze(fen, depth)
        );
      }
    } catch (error) {
      if (engine2 === worker) message = error.message;
    } finally {
      const paused = engine2 !== worker;
      worker.destroy();
      engine2 = void 0;
      running = false;
      for (const filter of filters) filter.disabled = false;
      pause.disabled = true;
      if (!dialog.open) {
        job = void 0;
        return;
      }
      start5.disabled = false;
      start5.textContent = job.records.length < games.length ? "Continuar an\xE1lisis" : "Analizar de nuevo";
      showProgress(job.records.length, games.length, message || (paused ? "An\xE1lisis en pausa. Se conservan las partidas completadas mientras esta pesta\xF1a siga abierta." : "An\xE1lisis terminado."));
      if (job.records.length) renderReport();
      updateSave();
    }
  });
  function stop2() {
    const worker = engine2;
    engine2 = void 0;
    worker?.destroy();
  }
  pause.addEventListener("click", stop2);
  dialog.addEventListener("close", () => {
    stop2();
    if (!running) job = void 0;
    batch = void 0;
  });
  role.addEventListener("change", () => setColorOptions());
  for (const filter of filters) filter.addEventListener("change", updateSelection);
  $("study-open").addEventListener("click", () => open().catch(showError2));
  return open;
}

// src/variation-view.js
function setupVariations(get, choosePromotion2, showError2) {
  const dialog = get("variation-dialog");
  const choices = get("variation-choices");
  const saveButton = get("variation-save");
  let root, node2, origin2, board2, orientation, save, trail, canSave;
  function render5() {
    const chess = new Chess(node2.fen);
    const color = chess.turn() === "w" ? "white" : "black";
    const last = node2.parent ? new Chess(node2.parent.fen).move(node2.san) : null;
    board2.set({
      fen: chess.fen(),
      orientation,
      turnColor: color,
      check: chess.inCheck(),
      lastMove: last ? [last.from, last.to] : void 0,
      movable: { color, free: false, dests: legalDests(chess) }
    });
    get("variation-line").textContent = lineText(root.fen, nodeMoves(node2)) || "Posici\xF3n inicial";
    get("variation-comment").textContent = node2.comment;
    get("variation-prev").disabled = !node2.parent;
    get("variation-next").disabled = !node2.children.length;
    get("variation-reset").disabled = node2 === origin2;
    saveButton.hidden = !save || !canSave(nodeMoves(node2));
    choices.replaceChildren(...node2.children.map((child) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = child.san;
      button.addEventListener("click", () => visit(child));
      return button;
    }));
  }
  function visit(next) {
    if (next.parent === node2) trail.set(node2, next);
    node2 = next;
    render5();
  }
  async function play(from, to) {
    const candidates = new Chess(node2.fen).moves({ verbose: true }).filter((move3) => move3.from === from && move3.to === to);
    if (candidates.length > 1) {
      render5();
      const promotion = await choosePromotion2();
      if (promotion) visit(addMove2(node2, { from, to, promotion }));
    } else if (candidates.length) visit(addMove2(node2, candidates[0].san));
    else render5();
  }
  const tryMove = (from, to) => play(from, to).catch((error) => {
    render5();
    showError2(error);
  });
  get("variation-prev").addEventListener("click", () => visit(node2.parent));
  get("variation-next").addEventListener("click", () => visit(trail.get(node2) || node2.children[0]));
  get("variation-reset").addEventListener("click", () => visit(origin2));
  saveButton.addEventListener("click", async () => {
    saveButton.disabled = true;
    try {
      await save(nodeMoves(node2));
      render5();
    } catch (error) {
      showError2(error);
    } finally {
      saveButton.disabled = false;
    }
  });
  return function open(doc2, cursor = doc2.cursor, options = {}) {
    root = moveTree(doc2);
    const main = doc2.moves.slice(0, cursor);
    origin2 = main.reduce((parent, san) => parent.children.find((child) => child.san === san), root);
    node2 = origin2;
    orientation = doc2.orientation || "white";
    save = options.save;
    canSave = options.canSave || (() => false);
    trail = /* @__PURE__ */ new Map();
    get("variation-title").textContent = doc2.title || "Explorar variante";
    dialog.showModal();
    board2 ||= Chessground(get("variation-board"), {
      coordinates: true,
      drawable: { enabled: false },
      premovable: { enabled: false },
      movable: { events: { after: tryMove } }
    });
    render5();
    if (options.move) tryMove(...options.move);
  };
}

// src/lichess-studies.js
var origin = "https://lichess.org";
function studyPath(link) {
  const url = new URL(link);
  const match = url.pathname.match(/^\/study\/([a-zA-Z0-9]{8})(?:\/([a-zA-Z0-9]{8}))?\/?$/);
  if (url.origin !== origin || !match) throw Error("Pega un enlace p\xFAblico de Lichess con el formato lichess.org/study/\u2026");
  return match.slice(1);
}
function studyChapter(doc2) {
  const source = pgnHeader(doc2.sourcePgn || "", "ChapterURL");
  return /^lichess:[a-zA-Z0-9]{8}:[a-zA-Z0-9]{8}$/.test(doc2.id) && /^https:\/\/lichess\.org\/study\/[a-zA-Z0-9]{8}\/[a-zA-Z0-9]{8}$/.test(source) ? source : "";
}
function parseChapters(pgn2, studyId) {
  const chapters = [];
  let omitted = 0;
  for (const text of pgn2.trim().split(/\r?\n(?:[ \t]*\r?\n)+(?=\[Event\s)/)) {
    try {
      const [study, chapter] = studyPath(pgnHeader(text, "ChapterURL"));
      const variant = pgnHeader(text, "Variant").toLowerCase();
      if (study !== studyId || !chapter || variant && !["standard", "chess", "from position"].includes(variant)) {
        throw Error("Cap\xEDtulo no compatible.");
      }
      if (text.length > 2e6) throw Error("Cap\xEDtulo demasiado grande.");
      const doc2 = newDocument();
      doc2.id = "lichess:" + study + ":" + chapter;
      doc2.initialFen = pgnHeader(text, "FEN") || doc2.initialFen;
      doc2.moves = pgnMainLine(doc2.initialFen, text);
      doc2.sourcePgn = text;
      doc2.title = (pgnHeader(text, "ChapterName") || pgnHeader(text, "Event") || doc2.title).slice(0, 200);
      doc2.orientation = pgnHeader(text, "Orientation") === "black" ? "black" : "white";
      chapters.push(validateDocument(doc2));
    } catch {
      omitted++;
    }
  }
  if (!chapters.length) throw Error("Este estudio no contiene cap\xEDtulos p\xFAblicos de ajedrez est\xE1ndar que Piol\xEDn pueda abrir.");
  return { chapters, omitted };
}
function credit(doc2, name) {
  return pgnHeader(doc2.sourcePgn, name);
}
function setupLichessStudies(get, store2, updateLibrary2) {
  const dialog = get("lichess-studies"), form = get("lichess-study-form");
  const status = get("lichess-study-status"), box = get("lichess-study-chapters");
  const save = get("lichess-study-save"), fetchButton = get("lichess-study-fetch");
  let chapters = [];
  get("lichess-studies-open").addEventListener("click", () => dialog.showModal());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (fetchButton.disabled || save.disabled) return;
    fetchButton.disabled = true;
    chapters = [];
    box.replaceChildren();
    save.hidden = true;
    status.textContent = "Buscando cap\xEDtulos\u2026";
    try {
      const [studyId, chapterId] = studyPath(get("lichess-study-url").value.trim());
      const path = studyId + (chapterId ? "/" + chapterId : "");
      const response = await fetch(origin + "/api/study/" + path + ".pgn?clocks=false&comments=true&variations=true&orientation=true", {
        signal: AbortSignal.timeout(25e3),
        credentials: "omit"
      });
      if (!response.ok) throw Error(response.status === 429 ? "Lichess pide esperar antes de volver a buscar." : "Lichess no ha devuelto el estudio. Comprueba que el enlace sea p\xFAblico.");
      const result = parseChapters(await response.text(), studyId);
      chapters = result.chapters;
      const existing = new Set((await store2.all()).map((doc2) => doc2.id));
      const title = credit(chapters[0], "StudyName") || chapters[0].title;
      status.textContent = title + " \xB7 " + chapters.length + " cap\xEDtulos disponibles." + (result.omitted ? " " + result.omitted + " cap\xEDtulos omitidos por incompatibilidad." : "");
      for (const chapter of chapters) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = chapter.id;
        input.disabled = existing.has(chapter.id);
        input.checked = !input.disabled;
        const annotator = credit(chapter, "Annotator").replace(/^https:\/\/lichess\.org\/@\//, "");
        label.append(input, " " + chapter.title + (annotator ? " \xB7 Anotaciones de " + annotator : "") + (input.disabled ? " \xB7 Ya guardado" : ""));
        box.append(label);
      }
      save.hidden = !box.querySelector("input:enabled");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      fetchButton.disabled = false;
    }
  });
  save.addEventListener("click", async () => {
    const selected = new Set([...box.querySelectorAll("input:checked:enabled")].map((input) => input.value));
    if (!selected.size) {
      status.textContent = "Selecciona al menos un cap\xEDtulo.";
      return;
    }
    save.disabled = true;
    try {
      const added = await store2.importChapters(chapters.filter((doc2) => selected.has(doc2.id)));
      await updateLibrary2();
      status.textContent = added ? added + " cap\xEDtulos guardados en la biblioteca." : "Esos cap\xEDtulos ya estaban guardados.";
      for (const input of box.querySelectorAll("input:checked:enabled")) {
        input.checked = false;
        input.disabled = true;
        input.parentElement.append(" \xB7 Ya guardado");
      }
      save.hidden = !box.querySelector("input:enabled");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });
}

// src/update-app.js
async function updateApp(registration2, initialWorker2, save, report) {
  const serviceWorker = navigator.serviceWorker;
  if (!registration2) throw Error("Abre Piol\xEDn Chess desde su enlace web para buscar actualizaciones.");
  await save();
  report("Buscando actualizaciones\u2026");
  const current = serviceWorker.controller;
  await registration2.update();
  const worker = registration2.installing || registration2.waiting;
  if (worker && ["installing", "installed", "activating"].includes(worker.state)) {
    await new Promise((resolve, reject) => {
      const timer2 = setTimeout(() => finish(Error("La descarga sigue en curso. Vuelve a pulsar Actualizar en un momento.")), 6e4);
      function finish(error) {
        clearTimeout(timer2);
        worker.removeEventListener("statechange", check);
        if (error) reject(error);
        else resolve();
      }
      function check() {
        if (worker.state === "activated") finish();
        if (worker.state === "redundant") finish(Error("No se pudo instalar la actualizaci\xF3n. Int\xE9ntalo de nuevo."));
      }
      worker.addEventListener("statechange", check);
      check();
    });
  }
  if (current !== serviceWorker.controller || serviceWorker.controller !== initialWorker2) {
    await save();
    location.reload();
    return;
  }
  report("Ya tienes la \xFAltima versi\xF3n.");
}

// src/storage.js
var LocalStore = class {
  async open() {
    if (!globalThis.indexedDB) throw Error("Este navegador no permite el almacenamiento local necesario.");
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("piolin-chess", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("games", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(Error("Cierra otras pesta\xF1as de piolin_chess para abrir los datos."));
    });
    this.db.onversionchange = () => this.db.close();
  }
  tx(mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("games", mode), store2 = tx.objectStore("games");
      let req;
      try {
        req = operation(store2);
      } catch (e) {
        tx.abort();
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error || Error("No se pudo guardar."));
      tx.onabort = () => reject(tx.error || Error("Guardado cancelado."));
    });
  }
  get(id) {
    return this.tx("readonly", (s) => s.get(id));
  }
  all() {
    return this.tx("readonly", (s) => s.getAll());
  }
  put(doc2) {
    return this.tx("readwrite", (s) => s.put(structuredClone(doc2)));
  }
  putMany(docs) {
    return this.tx("readwrite", (store2) => {
      for (const doc2 of docs) store2.put(doc2);
    });
  }
  async importChapters(chapters) {
    let added = 0;
    await this.tx("readwrite", (store2) => {
      for (const chapter of chapters) {
        const existing = store2.get(chapter.id);
        existing.onsuccess = () => {
          if (!existing.result) {
            store2.put(chapter);
            added++;
          }
        };
      }
    });
    return added;
  }
  saveStudy(study, gameKey) {
    return this.tx("readwrite", (store2) => {
      const request = store2.getAll();
      request.onsuccess = () => {
        const keys = new Set(request.result.filter((doc2) => doc2.id !== "draft" && !doc2.role).map(gameKey));
        for (const { game } of study.records) {
          if (keys.has(game.key)) continue;
          keys.add(game.key);
          store2.put({ ...game.doc, id: crypto.randomUUID() });
        }
        store2.put(study);
      };
    });
  }
  remove(id) {
    return this.tx("readwrite", (s) => s.delete(id));
  }
  restore(backup) {
    return this.tx("readwrite", (s) => {
      s.clear();
      for (const game of backup.games) s.put(game);
      s.put(backup.draft);
      for (const study of backup.studies) s.put(study);
    });
  }
};

// src/engine-store.js
var ENGINE_CACHE = "piolin-engine-v1";
var FULL_JS = "engine/full/stockfish-19.js";
var FULL_WASM = "engine/full/stockfish-19.wasm";
var FULL_BYTES = 99076105;
var abs = (path) => new URL(path, location.href).href;
var canUseFullEngine = () => typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated === true && "caches" in self;
async function fullEngineInstalled() {
  try {
    const cache = await caches.open(ENGINE_CACHE), hit = await cache.match(abs(FULL_WASM));
    if (!hit) return false;
    if (Number(hit.headers.get("content-length")) !== FULL_BYTES) {
      await cache.delete(abs(FULL_WASM));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
async function downloadFullEngine(onProgress = () => {
}) {
  const cache = await caches.open(ENGINE_CACHE);
  const res = await fetch(abs(FULL_WASM), { cache: "no-store" });
  if (!res.ok || !res.body) throw Error("No se pudo descargar Stockfish completo (" + res.status + ").");
  const reader = res.body.getReader();
  let received = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value: value2 } = await reader.read();
      if (done) {
        if (received !== FULL_BYTES) controller.error(Error("Descarga incompleta de Stockfish completo."));
        else controller.close();
        return;
      }
      received += value2.length;
      onProgress(received, FULL_BYTES);
      controller.enqueue(value2);
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
  await cache.put(abs(FULL_WASM), new Response(stream, { headers: { "content-type": "application/wasm", "content-length": String(FULL_BYTES) } }));
  navigator.storage?.persist?.().catch(() => {
  });
  if (!await fullEngineInstalled()) throw Error("Stockfish completo no qued\xF3 guardado en el dispositivo.");
}
function fullEngineOptions() {
  const cores = navigator.hardwareConcurrency || 2, memory = navigator.deviceMemory || 4;
  return { Threads: Math.max(1, Math.min(8, cores - 1)), Hash: memory >= 8 ? 256 : memory >= 4 ? 128 : 64 };
}

// src/app.js
var $2 = (id) => document.getElementById(id);
$2("app-version").textContent = "v" + APP_VERSION;
var store = new LocalStore();
var storeReady = false;
var doc = newDocument();
var board;
var dirtyTimer;
var saveTail = Promise.resolve();
var saveSequence = 0;
var enabled = false;
var pumping = false;
var pending = null;
var analysisSerial = 0;
var scheduleTimer;
var lastResult = null;
var escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var example = '[Event "Miniatura de ejemplo"]\n[White "Blancas"]\n[Black "Negras"]\n[Result "1-0"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
var bot = { active: false, color: "b", skill: 10, thinking: false, serial: 0, clock: null, times: { w: 0, b: 0 }, timed: false };
var toastTimer;
var registration;
var initialWorker = navigator.serviceWorker?.controller;
function toast(text) {
  $2("toast").textContent = text;
  $2("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $2("toast").hidden = true, 4500);
}
function engineStatus(text) {
  $2("engine-status").textContent = text;
  const failed = engine?.dead;
  $2("engine-dot").className = "status-dot" + (failed ? " error" : engine?.ready ? "" : " loading");
  $2("retry-engine").hidden = !failed;
}
var engineMode = "lite";
var engine;
function makeEngine(mode) {
  engineMode = mode;
  const full = mode === "full", options = full ? fullEngineOptions() : { Hash: 32 };
  const e = new LocalEngine({
    onStatus: (text) => {
      if (e === engine) engineStatus(text);
    },
    url: full ? FULL_JS : "engine/stockfish-19-lite-single.js",
    options,
    label: full ? `Stockfish 19 completo \xB7 ${options.Threads} ${options.Threads === 1 ? "hilo" : "hilos"}` : "Stockfish 19 lite"
  });
  return e;
}
engine = makeEngine("lite");
async function useEngine(mode) {
  engine.destroy();
  engine = makeEngine(mode);
  try {
    await engine.init();
  } catch (e) {
    if (mode === "lite") throw e;
    engine = makeEngine("lite");
    await engine.init();
    engineStatus("No se pudo iniciar el motor completo; usando Stockfish lite.");
  }
}
async function ensureFullEngine() {
  if (!canUseFullEngine()) {
    engineStatus(engine.label + " \xB7 el motor completo necesita instalar la app y recargar");
    return;
  }
  if (!await fullEngineInstalled()) {
    try {
      await downloadFullEngine((got, total) => engineStatus(`Descargando Stockfish completo (solo la primera vez)\u2026 ${Math.round(got / 1048576)} de ${Math.round(total / 1048576)} MB`));
    } catch (e) {
      engineStatus("Usando Stockfish lite. " + e.message);
      return;
    }
  }
  await runExclusive(() => useEngine("full"));
}
async function registerWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return false;
  try {
    registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    if (!self.crossOriginIsolated && !sessionStorage.getItem("piolin-isolation-reload")) {
      sessionStorage.setItem("piolin-isolation-reload", "1");
      location.reload();
      return true;
    }
  } catch (e) {
    console.warn("Service worker no disponible", e);
  }
  return false;
}
function showError(error) {
  toast(error.message || String(error));
}
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
function markDirty() {
  $2("save-status").textContent = storeReady ? "Guardando\u2026" : "Sin guardado: exporta una copia";
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => flushSave().catch(showError), 150);
}
async function flushSave() {
  clearTimeout(dirtyTimer);
  dirtyTimer = null;
  if (!storeReady) return;
  const serial = ++saveSequence;
  doc.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const snapshot = structuredClone({ ...doc, id: "draft" });
  const work = saveTail.catch(() => {
  }).then(() => store.put(snapshot));
  saveTail = work;
  try {
    await work;
    if (serial === saveSequence) $2("save-status").textContent = "\u2713 Sesi\xF3n guardada";
  } catch (e) {
    $2("save-status").textContent = "No se pudo guardar: exporta una copia";
    throw e;
  }
}
function resetEvaluation() {
  lastResult = null;
  $2("score-explanation").textContent = "Evaluaci\xF3n para blancas";
  $2("score").textContent = "\u2014";
  $2("rail-score").textContent = "\u2014";
  $2("eval-white").style.height = "50%";
  $2("depth-reached").textContent = "Sin an\xE1lisis de esta posici\xF3n";
  $2("pv").textContent = "Pulsa Analizar para evaluar esta posici\xF3n.";
  board?.setAutoShapes([]);
}
function renderPlayer(slot, white) {
  const label = white ? "Blancas" : "Negras";
  const name = pgnHeader(doc.sourcePgn || "", white ? "White" : "Black");
  const known = Boolean(name && name !== "?" && playerKey(name) !== playerKey(label));
  const studied = known && doc.studyPlayer && playerKey(name) === playerKey(doc.studyPlayer);
  const display = $2(slot + "-player");
  display.textContent = known ? name : label;
  display.title = display.textContent;
  $2(slot + "-caption").textContent = known ? label + (studied ? " \xB7 Jugador en estudio" : "") : "";
  $2(slot + "-avatar").textContent = white ? "\u2654" : "\u265A";
}
function render4() {
  const chess = positionAt(doc), history = chess.history({ verbose: true }), last = history.at(-1);
  board.set({
    fen: chess.fen(),
    orientation: doc.orientation,
    turnColor: chess.turn() === "w" ? "white" : "black",
    lastMove: last ? [last.from, last.to] : void 0,
    check: chess.inCheck(),
    movable: { free: false, color: bot.active && (chess.turn() === bot.color || doc.cursor < doc.moves.length) ? void 0 : chess.turn() === "w" ? "white" : "black", dests: legalDests(chess) }
  });
  if (bot.active && chess.isGameOver()) endBot();
  updateClocks();
  $2("game-title").value = doc.title;
  $2("notes").value = doc.notes;
  $2("depth").value = String(doc.depth || 14);
  const flipped = doc.orientation === "black";
  renderPlayer("top", flipped);
  renderPlayer("bottom", !flipped);
  $2("turn-status").textContent = chess.isCheckmate() ? "Jaque mate" : chess.isStalemate() ? "Ahogado" : chess.isDraw() ? "Tablas" : `Juegan ${chess.turn() === "w" ? "blancas" : "negras"}${chess.inCheck() ? " \xB7 jaque" : ""}`;
  $2("first").disabled = $2("prev").disabled = doc.cursor === 0;
  $2("next").disabled = $2("last").disabled = doc.cursor === doc.moves.length;
  $2("ply-label").textContent = last ? moveLabel(last.before, last.san) : "Inicio";
  $2("explore-game").textContent = pgnHeader(doc.sourcePgn || "", "ChapterURL") ? "Comentarios y variantes" : "Explorar variante";
  renderMoves();
  resetEvaluation();
  const cached = doc.analyses?.[chess.fen()];
  if (cached) {
    lastResult = cached;
    showEvaluation(cached.fen, cached.evaluation, cached.bestMove);
    $2("depth-reached").textContent += " \xB7 guardado";
  }
  scheduleAnalysis();
}
function renderMoves() {
  if (!doc.moves.length) {
    $2("moves").innerHTML = '<p class="empty-moves">Tu siguiente idea empieza aqu\xED.<small>Mueve una pieza o carga una partida.</small></p>';
    return;
  }
  const fields = doc.initialFen.split(" "), start5 = (Number(fields[5]) - 1) * 2 + (fields[1] === "b" ? 1 : 0), rows = /* @__PURE__ */ new Map();
  doc.moves.forEach((san, i) => {
    const absolute = start5 + i, num = Math.floor(absolute / 2) + 1;
    if (!rows.has(num)) rows.set(num, ["", ""]);
    rows.get(num)[absolute % 2] = `<button class="move-button${doc.cursor === i + 1 ? " selected" : ""}" data-ply="${i + 1}" aria-label="Ir a ${num}${absolute % 2 ? "..." : "."} ${escape(san)}">${escape(san)}</button>`;
  });
  $2("moves").innerHTML = [...rows].map(([n, ms]) => `<div class="move-row"><span class="move-num">${n}.</span>${ms[0] || "<span></span>"}${ms[1] || "<span></span>"}</div>`).join("");
  const list = $2("moves"), sel = list.querySelector(".selected");
  if (sel) {
    const l = list.getBoundingClientRect(), s = sel.getBoundingClientRect();
    if (s.top < l.top) list.scrollTop -= l.top - s.top;
    else if (s.bottom > l.bottom) list.scrollTop += s.bottom - l.bottom;
  }
}
function jump(cursor) {
  doc.cursor = Math.max(0, Math.min(doc.moves.length, cursor));
  render4();
  markDirty();
}
async function choosePromotion() {
  $2("promotion-dialog").showModal();
  return new Promise((resolve) => {
    const dialog = $2("promotion-dialog");
    const click = (e) => {
      const promotion = e.target.closest("[data-promotion]")?.dataset.promotion;
      if (!promotion && e.target.id !== "cancel-promotion") return;
      dialog.removeEventListener("click", click);
      dialog.removeEventListener("cancel", cancel3);
      dialog.close();
      resolve(promotion || null);
    };
    const cancel3 = (e) => {
      e.preventDefault();
      dialog.removeEventListener("click", click);
      dialog.removeEventListener("cancel", cancel3);
      dialog.close();
      resolve(null);
    };
    dialog.addEventListener("click", click);
    dialog.addEventListener("cancel", cancel3);
  });
}
async function onMove(from, to) {
  try {
    const chess = positionAt(doc), candidates = chess.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
    if (!candidates.length) {
      render4();
      return;
    }
    if (doc.cursor < doc.moves.length) {
      const next = candidates.find((move4) => move4.san === doc.moves[doc.cursor]);
      if (next && candidates.length === 1) jump(doc.cursor + 1);
      else exploreGame([from, to]);
      return;
    }
    let promotion;
    if (candidates.some((m) => m.promotion)) {
      render4();
      promotion = await choosePromotion();
      if (!promotion) return;
    }
    const move3 = chess.move({ from, to, promotion });
    doc.moves.push(move3.san);
    doc.cursor = doc.moves.length;
    render4();
    markDirty();
    botMove().catch(showError);
  } catch (e) {
    render4();
    showError(e);
  }
}
function showEvaluation(fen, info, bestMove) {
  if (!info) return;
  const sign = fen.split(" ")[1] === "w" ? 1 : -1, value2 = info.value * sign;
  const bound = info.bound === "exact" ? "" : info.bound === "lower" ? sign === 1 ? "\u2265" : "\u2264" : sign === 1 ? "\u2264" : "\u2265";
  const label = info.type === "mate" ? `#${value2}` : `${value2 >= 0 ? "+" : ""}${(value2 / 100).toFixed(2)}`;
  $2("score").textContent = bound + label;
  $2("rail-score").textContent = label;
  $2("score-explanation").textContent = info.type === "mate" ? value2 === 0 ? `Jaque mate \xB7 ganan ${sign === 1 ? "negras" : "blancas"}` : `Mate para ${value2 > 0 ? "blancas" : "negras"} en ${Math.abs(value2)}` : "Evaluaci\xF3n para blancas";
  const percentage = info.type === "mate" ? value2 === 0 ? sign === 1 ? 0 : 100 : value2 > 0 ? 100 : 0 : Math.max(4, Math.min(96, 50 + Math.tanh(value2 / 400) * 46));
  $2("eval-white").style.height = percentage + "%";
  $2("depth-reached").textContent = "Profundidad " + info.depth;
  const pv = pvToSan(fen, info.pv);
  $2("pv").textContent = pv || "Sin variante publicada para esta posici\xF3n.";
  const move3 = bestMove || info.pv[0];
  board.setAutoShapes(move3 && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move3) ? [{ orig: move3.slice(0, 2), dest: move3.slice(2, 4), brush: "paleGreen" }] : []);
}
function toggleButton() {
  $2("engine-toggle").textContent = enabled ? "Pausar" : "Analizar";
  $2("engine-toggle").classList.toggle("running", enabled);
  $2("engine-toggle").setAttribute("aria-label", enabled ? "Pausar an\xE1lisis" : "Iniciar an\xE1lisis");
}
function scheduleAnalysis() {
  clearTimeout(scheduleTimer);
  if (!enabled) return;
  const serial = ++analysisSerial;
  const fen = validateEngineFen(positionAt(doc).fen());
  pending = { fen, depth: Number($2("depth").value), serial };
  if (pumping) engine.stop().catch(showError);
  scheduleTimer = setTimeout(() => pump().catch(showError), 120);
}
async function pump() {
  if (pumping || !enabled) return;
  pumping = true;
  try {
    await engine.init();
    while (enabled && pending) {
      const request = pending;
      pending = null;
      engineStatus("Calculando en tu dispositivo\u2026");
      const result = await engine.analyze(request.fen, request.depth, (info) => {
        if (enabled && request.serial === analysisSerial && request.fen === positionAt(doc).fen()) showEvaluation(request.fen, info);
      });
      if (enabled && request.serial === analysisSerial && result.fen === positionAt(doc).fen()) {
        lastResult = result;
        if (result.evaluation) {
          doc.analyses ??= {};
          doc.analyses[result.fen] = result;
          const keys = Object.keys(doc.analyses);
          while (keys.length > 32) delete doc.analyses[keys.shift()];
          markDirty();
        }
        showEvaluation(result.fen, result.evaluation, result.bestMove);
        engineStatus(engine.label + " \xB7 an\xE1lisis terminado");
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      enabled = false;
      pending = null;
      engineStatus(e.message);
      showError(e);
    }
  } finally {
    pumping = false;
    toggleButton();
    if (enabled && pending) setTimeout(() => pump().catch(showError), 0);
  }
}
var openVariation = setupVariations($2, choosePromotion, showError);
function exploreGame(move3) {
  const current = doc;
  const sameLine = (a, b) => a.every((san, index) => san === b[index]);
  const canSave = (line) => line.length && !sameLine(line, current.moves) && !current.variations?.some((saved) => sameLine(line, saved)) && (current.variations?.length || 0) < 100;
  render4();
  openVariation(current, current.cursor, {
    move: move3,
    canSave: (line) => storeReady && canSave(line),
    save: async (line) => {
      const entry = { ...structuredClone(current), variations: [...current.variations || [], line] };
      if (current.libraryId) {
        const saved = await store.get(current.libraryId);
        if (saved) await store.put({ ...saved, variations: entry.variations, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      }
      current.variations = entry.variations;
      await flushSave();
      toast(current.libraryId ? "Variante guardada en la biblioteca." : "Variante guardada en esta sesi\xF3n.");
    }
  });
}
function openPractice(doc2, cursor) {
  let saved = false;
  openVariation(doc2, cursor, {
    canSave: (line) => storeReady && !saved && line.length > cursor,
    save: async (line) => {
      const entry = {
        ...newDocument(),
        id: crypto.randomUUID(),
        title: doc2.title,
        initialFen: doc2.initialFen,
        orientation: doc2.orientation,
        moves: line,
        cursor: line.length
      };
      await store.put(validateDocument(entry));
      saved = true;
      await updateLibrary();
      toast("Variante guardada en la biblioteca.");
    }
  });
}
async function updateLibrary() {
  if (!storeReady) return;
  const entries2 = await store.all();
  const games = entries2.filter((g) => g.id !== "draft" && !g.role).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  $2("library-count").textContent = String(games.length);
  $2("lib-modal-count").textContent = String(games.length);
  $2("library-studies").innerHTML = entries2.filter((entry) => entry.role).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((study) => `<div class="library-item"><div class="library-description"><strong>${escape(study.name)}</strong><small>${study.role === "profile" ? "Mi perfil" : "Rival"} \xB7 ${study.records.length} partidas analizadas</small></div><button data-study="${escape(study.id)}">Abrir estudio</button><button class="delete-button" data-remove-study="${escape(study.id)}" aria-label="Eliminar estudio">\xD7</button></div>`).join("");
  const chapters = games.filter(studyChapter);
  const regular = games.filter((game) => !studyChapter(game));
  $2("library-lichess").innerHTML = chapters.length ? "<h3>Estudios de Lichess</h3>" + chapters.map((game) => {
    const title = pgnHeader(game.sourcePgn, "StudyName");
    return `<div class="library-item"><div class="library-description"><strong>${escape(game.title)}</strong><small>${escape(title)} \xB7 <a href="${studyChapter(game)}" target="_blank" rel="noopener noreferrer">Original en Lichess</a></small></div><button data-open="${game.id}">Abrir cap\xEDtulo</button><button class="delete-button" data-delete="${game.id}" aria-label="Eliminar cap\xEDtulo">\xD7</button></div>`;
  }).join("") : "";
  $2("library-list").innerHTML = regular.length ? regular.map((g) => `<div class="library-item"><div class="library-description"><strong>${escape(g.title)}</strong><small>${g.moves.length} medias jugadas \xB7 ${escape(new Date(g.updatedAt).toLocaleDateString("es-ES"))}</small></div><button data-open="${escape(g.id)}">Abrir</button><button class="delete-button" data-delete="${escape(g.id)}" aria-label="Eliminar ${escape(g.title)}">\xD7</button></div>`).join("") : "<p>Todav\xEDa no hay partidas. Usa \xABGuardar en biblioteca\xBB para a\xF1adir la primera.</p>";
}
async function makeBackup() {
  if (!storeReady) throw Error("El almacenamiento no est\xE1 disponible. Exporta al menos el PGN actual.");
  await flushSave();
  const entries2 = (await store.all()).filter((g) => g.id !== "draft");
  const games = entries2.filter((g) => !g.role), studies = entries2.filter((g) => g.role);
  return JSON.stringify({ application: "piolin_chess", schema: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), draft: structuredClone(doc), games, studies }, null, 2);
}
function action(id, fn) {
  $2(id).addEventListener("click", () => Promise.resolve().then(fn).catch(showError));
}
action("explore-game", () => exploreGame());
action("update-app", async () => {
  const button = $2("update-app");
  const report = (message) => {
    $2("update-status").textContent = message;
  };
  button.disabled = true;
  try {
    await updateApp(registration, initialWorker, flushSave, report);
  } catch (error) {
    report(error.message);
  } finally {
    button.disabled = false;
  }
});
setupLichessStudies($2, store, updateLibrary);
function renderTrapCatalog() {
  const side = $2("trap-color").value;
  $2("trap-catalog").replaceChildren(...openingTraps.filter((trap) => !side || trap.color === side).map((trap) => trapCard(trap, openPractice)));
}
action("traps-open", () => {
  renderTrapCatalog();
  $2("traps-dialog").showModal();
});
$2("trap-color").addEventListener("change", renderTrapCatalog);
action("flip", () => {
  doc.orientation = doc.orientation === "white" ? "black" : "white";
  render4();
  markDirty();
});
action("first", () => jump(0));
action("prev", () => jump(doc.cursor - 1));
action("next", () => jump(doc.cursor + 1));
action("last", () => jump(doc.moves.length));
$2("moves").addEventListener("click", (e) => {
  const ply = e.target.closest("[data-ply]")?.dataset.ply;
  if (ply) jump(Number(ply));
});
$2("game-title").addEventListener("input", () => {
  doc.title = $2("game-title").value;
  markDirty();
});
$2("notes").addEventListener("input", () => {
  doc.notes = $2("notes").value;
  markDirty();
});
action("new-game", async () => {
  await flushSave();
  if (!confirm("\xBFAbrir una sesi\xF3n nueva? Guarda primero en biblioteca si quieres conservar esta partida.")) return;
  doc = newDocument();
  render4();
  await flushSave();
});
action("analysis-tab", () => {
  $2("library-dialog").close();
  $2("board").scrollIntoView({ block: "center", behavior: "smooth" });
});
action("import-open", () => {
  $2("import-error").classList.add("error");
  $2("import-error").textContent = "";
  $2("import-dialog").showModal();
});
action("load-example", () => {
  $2("import-text").value = example;
});
$2("pgn-file").addEventListener("change", async (e) => {
  try {
    const file2 = e.target.files[0];
    if (!file2) return;
    if (file2.size > 2e6) throw Error("El PGN supera 2 MB.");
    $2("import-text").value = await file2.text();
  } catch (err) {
    $2("import-error").textContent = err.message;
  } finally {
    e.target.value = "";
  }
});
function markStudyPlayer(game, name) {
  if (!name || !game.sourcePgn) return;
  const key2 = playerKey(name);
  const white = pgnHeader(game.sourcePgn, "White"), black = pgnHeader(game.sourcePgn, "Black");
  if (playerKey(white) === key2) game.studyPlayer = white;
  else if (playerKey(black) === key2) {
    game.studyPlayer = black;
    game.orientation = "black";
  }
}
async function importFromDialog(pgn2, studyPlayer = "") {
  try {
    const imported = importText(pgn2);
    if ((doc.moves.length || doc.notes) && !confirm("Cargar sustituir\xE1 la sesi\xF3n actual. Las partidas de biblioteca se conservan. \xBFContinuar?")) return;
    markStudyPlayer(imported, studyPlayer);
    doc = imported;
    render4();
    await flushSave();
    $2("import-dialog").close();
    toast("Partida cargada y guardada en la sesi\xF3n.");
  } catch (error) {
    $2("import-error").classList.add("error");
    $2("import-error").textContent = "No se pudo cargar: " + error.message;
  }
}
action("import-confirm", () => importFromDialog($2("import-text").value));
async function studyPgns(pgns, preferredPlayer, sourceDialog) {
  const games = [];
  let skipped = 0;
  for (const pgn2 of pgns) {
    try {
      const game = importText(pgn2);
      if (!studyGame(game)) {
        skipped++;
        continue;
      }
      markStudyPlayer(game, preferredPlayer);
      games.push(game);
    } catch {
      skipped++;
    }
  }
  if (!games.length) throw Error("No hay partidas PGN con ambos jugadores identificados y jugadas v\xE1lidas.");
  await openStudy({ preferredPlayer, games, skipped });
  sourceDialog.close();
  return `${games.length} partidas disponibles. ${skipped} omitidas.`;
}
document.addEventListener("piolin:open-online-game", (event) => {
  const { pgn: pgn2, player } = event.detail;
  studyPgns([pgn2], player, $2("online-dialog")).catch((error) => {
    $2("online-status").textContent = error.message;
  });
});
document.addEventListener("piolin:study-pgn-batch", (event) => {
  const { pgns, player, resolve, reject } = event.detail;
  studyPgns(pgns, player, $2("online-dialog")).then(resolve, reject);
});
action("import-batch", async () => {
  const output = $2("import-error");
  try {
    const pgns = $2("import-text").value.trim().split(/\r?\n\s*\r?\n(?=\[Event\s)/);
    await studyPgns(pgns, "", $2("import-dialog"));
  } catch (error) {
    output.classList.add("error");
    output.textContent = error.message;
  }
});
var openStudy = setupStudy({
  load: () => storeReady ? store.all().then((entries2) => entries2.filter((entry) => entry.id !== "draft")) : [],
  save: async (study) => {
    if (!storeReady) throw Error("La biblioteca no est\xE1 disponible en este navegador.");
    await store.saveStudy(study, (doc2) => studyGame(doc2)?.key);
    await updateLibrary();
    navigator.storage?.persist?.().catch(() => {
    });
  },
  showError,
  openPractice
});
$2("library-studies").addEventListener("click", (event) => {
  const id = event.target.closest("[data-study]")?.dataset.study;
  const remove = event.target.closest("[data-remove-study]")?.dataset.removeStudy;
  if (id) store.get(id).then((saved) => openStudy({ preferredPlayer: saved.name, saved })).catch(showError);
  if (remove && confirm("\xBFEliminar el estudio de la biblioteca?")) {
    store.remove(remove).then(updateLibrary).catch(showError);
  }
});
action("export-pgn", () => download("piolin_partida.pgn", exportPgn(doc), "application/x-chess-pgn"));
action("library-open", async () => {
  if (!storeReady) throw Error("No hay almacenamiento disponible.");
  await updateLibrary();
  $2("library-dialog").showModal();
});
action("save-library", async () => {
  if (!storeReady) throw Error("No se puede guardar: exporta el PGN.");
  await flushSave();
  const entry = { ...structuredClone(doc), id: doc.libraryId || crypto.randomUUID(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  delete entry.libraryId;
  await store.put(entry);
  doc.libraryId = entry.id;
  await flushSave();
  await updateLibrary();
  navigator.storage?.persist?.().catch(() => {
  });
  toast("Partida guardada en tu biblioteca.");
});
$2("library-dialog").addEventListener("click", (e) => {
  (async () => {
    const id = e.target.closest("[data-open]")?.dataset.open, del = e.target.closest("[data-delete]")?.dataset.delete;
    if (id) {
      if ((doc.moves.length || doc.notes) && !confirm("\xBFAbrir esta partida y sustituir la sesi\xF3n actual?")) return;
      const game = validateDocument(await store.get(id));
      endBot();
      doc = { ...game, id: "draft", libraryId: game.id };
      render4();
      await flushSave();
      $2("library-dialog").close();
      if (studyChapter(game)) exploreGame();
    }
    if (del && confirm("\xBFEliminar esta partida de la biblioteca?")) {
      await store.remove(del);
      if (doc.libraryId === del) {
        delete doc.libraryId;
        markDirty();
      }
      await updateLibrary();
    }
  })().catch(showError);
});
action("backup-export", async () => {
  download("piolin_copia_" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", await makeBackup());
  toast("Copia exportada. Cons\xE9rvala fuera del navegador.");
});
action("backup-import", () => $2("backup-file").click());
$2("backup-file").addEventListener("change", (e) => {
  (async () => {
    const file2 = e.target.files[0];
    if (!file2) return;
    if (file2.size > 2e7) throw Error("La copia supera 20 MB.");
    if (!storeReady) throw Error("No hay almacenamiento disponible.");
    const backup = parseBackup(await file2.text());
    if (!confirm(`Restaurar reemplazar\xE1 la biblioteca y la sesi\xF3n actuales por ${backup.games.length} partidas. Se descargar\xE1 antes una copia de seguridad de lo actual. \xBFContinuar?`)) return;
    download("piolin_antes_de_restaurar.json", await makeBackup());
    await store.restore(backup);
    doc = backup.draft;
    render4();
    await updateLibrary();
    $2("save-status").textContent = "\u2713 Copia restaurada";
    toast("Biblioteca y sesi\xF3n restauradas.");
  })().catch(showError).finally(() => e.target.value = "");
});
async function runExclusive(fn) {
  const was = enabled;
  enabled = false;
  pending = null;
  analysisSerial++;
  clearTimeout(scheduleTimer);
  toggleButton();
  await engine.stop();
  while (pumping) await new Promise((r) => setTimeout(r, 25));
  try {
    return await fn();
  } finally {
    if (was) {
      enabled = true;
      toggleButton();
      scheduleAnalysis();
    }
  }
}
var formatClock = (s) => {
  s = Math.max(0, s);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};
function updateClocks() {
  $2("clock-top").hidden = $2("clock-bottom").hidden = !(bot.active && bot.timed);
  if (!bot.timed) return;
  const flipped = doc.orientation === "black";
  $2("clock-top").textContent = formatClock(bot.times[flipped ? "w" : "b"]);
  $2("clock-bottom").textContent = formatClock(bot.times[flipped ? "b" : "w"]);
}
function endBot(message) {
  bot.active = false;
  bot.serial++;
  clearInterval(bot.clock);
  $2("mode-badge").textContent = "AN\xC1LISIS";
  if (message) toast(message);
}
function botTurn() {
  const chess = positionAt(doc);
  return bot.active && doc.cursor === doc.moves.length && chess.turn() === bot.color && !chess.isGameOver();
}
async function botMove() {
  if (!botTurn() || bot.thinking) return;
  bot.thinking = true;
  const serial = ++bot.serial;
  $2("gm-advice-text").textContent = "\u{1F916} Piol\xEDn est\xE1 pensando su jugada\u2026";
  try {
    await runExclusive(async () => {
      const fen = validateEngineFen(positionAt(doc).fen()), depth = { 1: 4, 5: 7, 10: 10, 15: 13, 20: 16 }[bot.skill] || 10;
      engine.setOption("Skill Level", bot.skill);
      let result;
      try {
        result = await engine.analyze(fen, depth);
      } finally {
        if (!engine.dead) engine.setOption("Skill Level", 20);
      }
      if (serial !== bot.serial || !botTurn() || !result.bestMove) return;
      const chess = positionAt(doc), move3 = chess.move({ from: result.bestMove.slice(0, 2), to: result.bestMove.slice(2, 4), promotion: result.bestMove[4] });
      doc.moves.push(move3.san);
      doc.cursor = doc.moves.length;
      render4();
      markDirty();
      $2("gm-advice-text").textContent = `\u{1F916} Piol\xEDn ha jugado ${move3.san}. \xA1Es tu turno!`;
    });
  } catch (e) {
    if (e.name !== "AbortError") throw e;
  } finally {
    bot.thinking = false;
  }
}
action("play-bot-open", () => $2("bot-dialog").showModal());
action("bot-start", async () => {
  if (doc.moves.length && !confirm("Empezar una partida nueva sustituir\xE1 la sesi\xF3n actual. \xBFContinuar?")) return;
  await engine.init();
  const human = $2("bot-color").value === "b" ? "b" : "w", seconds = Number($2("bot-time").value) || 0;
  endBot();
  bot.color = human === "w" ? "b" : "w";
  bot.skill = Number($2("bot-strength").value);
  bot.timed = seconds > 0;
  bot.times = { w: seconds, b: seconds };
  doc = newDocument();
  doc.orientation = human === "w" ? "white" : "black";
  doc.title = "Partida vs Piol\xEDn (nivel " + ({ 1: 1, 5: 2, 10: 3, 15: 4, 20: 5 }[bot.skill] || 3) + ")";
  bot.active = true;
  $2("mode-badge").textContent = "VS M\xC1QUINA";
  $2("bot-dialog").close();
  clearInterval(bot.clock);
  if (bot.timed) bot.clock = setInterval(() => {
    if (!bot.active) return;
    const turn = positionAt(doc).turn();
    bot.times[turn]--;
    updateClocks();
    if (bot.times[turn] <= 0) endBot(turn === "w" ? "\xA1Tiempo agotado para las blancas!" : "\xA1Tiempo agotado para las negras!");
  }, 1e3);
  render4();
  await flushSave();
  await botMove();
});
action("bot-stop", () => {
  endBot();
  render4();
  $2("bot-dialog").close();
});
var mistakes = [];
var mistakeCursor = -1;
var auditSerial = 0;
var clampCp = (info) => {
  const v = info.type === "mate" ? (info.value > 0 ? 1 : -1) * 1e3 : info.value;
  return Math.max(-1e3, Math.min(1e3, v));
};
async function auditGame() {
  if (!doc.moves.length) {
    toast("Carga o juega primero una partida para revisar sus fallos.");
    return;
  }
  const serial = ++auditSerial, moves2 = [...doc.moves], depth = Math.min(doc.depth || 14, 12);
  $2("mistakes-panel").hidden = false;
  $2("mistakes-list").innerHTML = "";
  mistakes = [];
  mistakeCursor = -1;
  $2("gm-audit-btn").disabled = true;
  try {
    await runExclusive(async () => {
      const evals = [];
      for (let i = 0; i <= moves2.length; i++) {
        if (serial !== auditSerial) return;
        $2("mistakes-summary").textContent = `Revisando posici\xF3n ${i + 1} de ${moves2.length + 1}\u2026`;
        const fen = validateEngineFen(positionAt({ initialFen: doc.initialFen, moves: moves2 }, i).fen()), r = await engine.analyze(fen, depth);
        if (serial !== auditSerial) return;
        evals.push(r.evaluation ? clampCp(r.evaluation) * (fen.split(" ")[1] === "w" ? 1 : -1) : 0);
      }
      const fields = doc.initialFen.split(" "), start5 = (Number(fields[5]) - 1) * 2 + (fields[1] === "b" ? 1 : 0);
      for (let i = 1; i <= moves2.length; i++) {
        const white = (start5 + i - 1) % 2 === 0, loss = (evals[i - 1] - evals[i]) * (white ? 1 : -1);
        if (loss < 75) continue;
        const type = loss >= 300 ? { tag: "?? Grave", cls: "badge-blunder" } : loss >= 150 ? { tag: "? Error", cls: "badge-mistake" } : { tag: "?! Imprecisi\xF3n", cls: "badge-inaccuracy" };
        const num = Math.floor((start5 + i - 1) / 2) + 1;
        mistakes.push({ ply: i, label: `${num}${white ? "." : "..."} ${moves2[i - 1]}`, loss: (loss / 100).toFixed(2), ...type });
      }
      $2("mistakes-summary").textContent = `Fallos encontrados: ${mistakes.length}`;
      $2("mistakes-list").innerHTML = mistakes.length ? mistakes.map((m) => `<div class="mistake-item" data-mistake-ply="${m.ply}"><span><strong>${escape(m.label)}</strong> (pierde ${m.loss} peones)</span><span class="${m.cls}">${m.tag}</span></div>`).join("") : '<p style="font-size:12px;margin:4px 0;">Partida muy precisa: no se detectaron p\xE9rdidas relevantes.</p>';
    });
  } finally {
    $2("gm-audit-btn").disabled = false;
  }
}
action("gm-audit-btn", auditGame);
$2("mistakes-list").addEventListener("click", (e) => {
  const ply = e.target.closest("[data-mistake-ply]")?.dataset.mistakePly;
  if (ply) jump(Number(ply));
});
action("next-mistake-btn", () => {
  if (!mistakes.length) return;
  mistakeCursor = (mistakeCursor + 1) % mistakes.length;
  jump(mistakes[mistakeCursor].ply);
});
action("help-open", () => $2("help-dialog").showModal());
action("engine-toggle", async () => {
  enabled = !enabled;
  toggleButton();
  if (enabled) scheduleAnalysis();
  else {
    pending = null;
    analysisSerial++;
    clearTimeout(scheduleTimer);
    await engine.stop();
    engineStatus(engine.label + " \xB7 en pausa");
  }
});
$2("depth").addEventListener("change", () => {
  doc.depth = Number($2("depth").value);
  markDirty();
  scheduleAnalysis();
});
action("retry-engine", async () => {
  enabled = false;
  pending = null;
  analysisSerial++;
  engine.destroy();
  engine = makeEngine(engineMode);
  $2("engine-toggle").disabled = true;
  await engine.init();
  $2("engine-toggle").disabled = false;
  $2("retry-engine").hidden = true;
  toggleButton();
});
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea,select") || document.querySelector("dialog[open]")) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    jump(doc.cursor - 1);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    jump(doc.cursor + 1);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    flushSave().catch(showError);
    if (enabled) {
      enabled = false;
      pending = null;
      analysisSerial++;
      clearTimeout(scheduleTimer);
      toggleButton();
      engine.stop().catch(() => {
      });
      engineStatus("An\xE1lisis pausado al salir de la aplicaci\xF3n.");
    }
  }
});
window.addEventListener("pagehide", () => {
  flushSave().catch(() => {
  });
});
window.addEventListener("beforeunload", () => engine.destroy());
async function start4() {
  if (await registerWorker()) return;
  $2("origin-warning").hidden = location.protocol !== "file:";
  board = Chessground($2("board"), {
    fen: doc.initialFen,
    orientation: "white",
    coordinates: true,
    animation: { enabled: true, duration: 160 },
    movable: { free: false, color: "white", dests: legalDests(new Chess()), events: { after: onMove } },
    drawable: { enabled: true, visible: true },
    premovable: { enabled: false }
  });
  try {
    await store.open();
    storeReady = true;
    const saved = await store.get("draft");
    if (saved) doc = validateDocument(saved);
    $2("save-status").textContent = saved ? "\u2713 Sesi\xF3n recuperada" : "\u2713 Guardado local preparado";
    await updateLibrary();
  } catch (e) {
    $2("save-status").textContent = "No se pudo recuperar: exporta antes de cambiar";
    toast("Datos locales: " + e.message);
  }
  render4();
  engine.init().then(() => {
    $2("engine-toggle").disabled = false;
    $2("gm-audit-btn").disabled = false;
    engineStatus(engine.label + " \xB7 motor preparado");
    return ensureFullEngine();
  }).catch((e) => {
    engineStatus(e.message);
    showError(e);
  });
}
start4().catch(showError);
/*! Bundled license information:

chess.js/dist/esm/chess.js:
  (**
   * @license
   * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   *    this list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the documentation
   *    and/or other materials provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/
//# sourceMappingURL=app.js.map
