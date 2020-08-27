import React, { useReducer } from "react"

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * Math.floor(max))
}

interface Square {
  isBomb: boolean
  status: "hidden" | "visible" | "marked"
  bombCount: number
}

const emptySquare: Square = { isBomb: false, status: "hidden", bombCount: 0 }
const bombSquare: Square = { isBomb: true, status: "hidden", bombCount: 0 }

/**
 * @function generateEmptyBoard
 * @param rows number of rows
 * @param cols number of colums
 * @returns Square[][]
 */
function generateEmptyBoard(rows: number, cols: number): Square[][] {
  const row = Array<Square>(cols).fill(emptySquare)
  return Array<Square[]>(rows).fill(row)
}

/**
 * @function generateBoard
 * @param rows number of rows
 * @param cols number of colums
 * @param bombs number of bombs
 * @param visitedEmpty Coordinate that doesn't have a bomb and is visited
 * @returns Square[][]
 */
function generateBoard(
  rows: number,
  cols: number,
  bombs: number,
  visitedEmpty: Coordinate
): Square[][] {
  const boardSize = rows * cols
  const visitedEmptyIndex = visitedEmpty.row * cols + visitedEmpty.col
  // one dimentional array of empty squares
  let oneDBoard = Array<Square>(boardSize)
  oneDBoard.fill(emptySquare)

  // add bombs to random places in array
  for (let index = 0; index < bombs; index++) {
    let randomIndex = getRandomInt(boardSize)
    while (oneDBoard[randomIndex].isBomb || randomIndex === visitedEmptyIndex) {
      randomIndex = getRandomInt(boardSize)
    }
    oneDBoard[randomIndex] = bombSquare
  }
  oneDBoard[visitedEmptyIndex] = { ...emptySquare, status: "visible" }
  // create 2D array
  let twoDArray = Array<Square[]>(rows)
  for (let index = 0; index < rows; index++) {
    twoDArray[index] = oneDBoard.slice(index * cols, (index + 1) * cols)
  }

  // add bombCount to 2D array squares
  const board = twoDArray.map((row, rowIndex) =>
    row.map((square, colIndex) => ({
      ...square,
      bombCount: getBombCount(twoDArray, rowIndex, colIndex),
    }))
  )

  return board
}

/**
 * @function getNearSquares
 * @param board Square[][]
 * @param rowIndex row index of square
 * @param colIndex col index of square
 * @returns Square[][] limited to the input square neighbours
 */
function getNearSquares(
  board: Square[][],
  rowIndex: number,
  colIndex: number
): Square[][] {
  const nearRows = board.slice(Math.max(rowIndex - 1, 0), rowIndex + 2)
  return nearRows.map((row) =>
    row.slice(Math.max(colIndex - 1, 0), colIndex + 2)
  )
}

/**
 * @function getBombCount
 * @param board Square[][]
 * @param rowIndex row index of square
 * @param colIndex col index of square
 * @returns number of bombs near square (includes square itself)
 */
function getBombCount(
  board: Square[][],
  rowIndex: number,
  colIndex: number
): number {
  const nearSquares = getNearSquares(board, rowIndex, colIndex)
  const count = nearSquares
    .map((row) => row.reduce((sum, sq) => sum + (sq.isBomb ? 1 : 0), 0))
    .reduce((sum, num) => sum + num, 0)
  return count
}

interface Coordinate {
  row: number
  col: number
}
interface CoorWithVisit extends Coordinate {
  needVisit: boolean
}

function showMultipleSquares(
  board: Square[][],
  visits: CoorWithVisit[]
): Square[][] {
  const [currentVisit, ...moreVisits] = visits.filter((coor) => coor.needVisit)
  if (!currentVisit) {
    return board
  }
  const { row: rowIndex, col: colIndex } = currentVisit
  const newState = board.map((row, rowIndexLocal) =>
    rowIndexLocal >= rowIndex - 1 && rowIndexLocal <= rowIndex + 1
      ? row.map((col, colIndexLocal) => {
          if (colIndexLocal >= colIndex - 1 && colIndexLocal <= colIndex + 1) {
            if (
              (colIndex !== colIndexLocal || rowIndex !== rowIndexLocal) &&
              col.bombCount === 0 &&
              !visits.some(
                (visit) =>
                  visit.row === rowIndexLocal && visit.col === colIndexLocal
              )
            ) {
              moreVisits.push({
                row: rowIndexLocal,
                col: colIndexLocal,
                needVisit: true,
              })
            }
            return { ...col, status: "visible" } as Square
          }
          return col
        })
      : row
  )
  const newVisits: CoorWithVisit[] = [
    ...visits.filter((coor) => !coor.needVisit),
    { ...currentVisit, needVisit: false },
    ...moreVisits,
  ]
  return showMultipleSquares(newState, newVisits)
}

/**
 * @function setSquare
 * @param board
 * @param coordinate
 * @param status
 * @returns new board with given coordinate set to given status
 */
function setSquare(
  board: Square[][],
  { row: rowIndex, col: colIndex }: Coordinate,
  status: "visible" | "marked" | "hidden"
): Square[][] {
  return [
    ...board.slice(0, rowIndex),
    [
      ...board[rowIndex].slice(0, colIndex),
      { ...board[rowIndex][colIndex], status },
      ...board[rowIndex].slice(colIndex + 1, board[rowIndex].length),
    ],
    ...board.slice(rowIndex + 1, board.length),
  ]
}

function showSquare(board: Square[][], coord: Coordinate) {
  return setSquare(board, coord, "visible")
}

function markSquare(board: Square[][], coord: Coordinate) {
  return setSquare(board, coord, "marked")
}

function hideSquare(board: Square[][], coord: Coordinate) {
  return setSquare(board, coord, "hidden")
}

function isWin(board: Square[][]): boolean {
  return (
    board.flatMap((row) =>
      row.filter((square) => square.status === "hidden" && !square.isBomb)
    ).length === 0
  )
}

enum GameState {
  NotStarted,
  Playing,
  Win,
  Lose,
}

interface State {
  board: Square[][]
  gameState: GameState
}

type Action =
  | {
      type: "squareClick"
      payload: Coordinate
    }
  | {
      type: "squareMark"
      payload: Coordinate
    }
  | { type: "reset" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "squareClick":
      const { row, col } = action.payload
      const startBoard =
        state.gameState === GameState.NotStarted
          ? generateBoard(
              state.board.length,
              state.board[0].length,
              10,
              action.payload
            )
          : state.board

      const newBoard =
        startBoard[row][col].bombCount === 0
          ? showMultipleSquares(startBoard, [
              { ...action.payload, needVisit: true },
            ])
          : showSquare(startBoard, action.payload)
      return {
        board: newBoard,
        gameState: state.board[row][col].isBomb
          ? GameState.Lose
          : isWin(newBoard)
          ? GameState.Win
          : GameState.Playing,
      }
    case "squareMark":
      if (state.gameState === GameState.NotStarted) {
        return state
      }
      const coord = action.payload
      if (state.board[coord.row][coord.col].status === "marked") {
        return {
          ...state,
          board: hideSquare(state.board, action.payload),
        }
      }
      return {
        ...state,
        board: markSquare(state.board, action.payload),
      }
    case "reset":
      return {
        board: generateEmptyBoard(8, 10),
        gameState: GameState.NotStarted,
      }
    default:
      return state
  }
}

function clickHandler(dispatch: React.Dispatch<Action>, coord: Coordinate) {
  let timeoutId: NodeJS.Timeout | null
  return function statusEventHandler(status: "hidden" | "marked") {
    return function mouseEventHandler(
      e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) {
      if (e.type === "mousedown") {
        timeoutId = setTimeout(() => {
          dispatch({
            type: "squareMark",
            payload: coord,
          })
          timeoutId = null
        }, 500)
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId)
          if (status === "hidden") {
            dispatch({
              type: "squareClick",
              payload: coord,
            })
          }
        }
      }
    }
  }
}
function App() {
  const [{ board, gameState }, dispatch] = useReducer(reducer, {
    board: generateEmptyBoard(8, 10),
    gameState: GameState.NotStarted,
  })
  return (
    <>
      {board.map((row, rowIndex) => (
        <div style={{ display: "flex", flexDirection: "row" }} key={rowIndex}>
          {row.map((square, colIndex) => (
            <Square
              {...square}
              clickHandler={clickHandler(dispatch, {
                row: rowIndex,
                col: colIndex,
              })}
              gameState={gameState}
              bombCount={square.bombCount}
              key={rowIndex * 10 + colIndex}
            />
          ))}
        </div>
      ))}
      <button onClick={() => dispatch({ type: "reset" })}>Reset</button>
      {gameState === GameState.Lose && <h1>Sad!</h1>}
      {gameState === GameState.Win && <h1>Hooray!</h1>}
    </>
  )
}

const baseStyle = {
  height: "20px",
  width: "20px",
  border: "solid 1px #f0f0f0",
}

const hiddenStyle = (gameOver: boolean) => ({
  ...baseStyle,
  backgroundColor: gameOver ? "#ffaaaa" : "#dadada",
  cursor: "pointer",
})

const markedStyle = (gameOver: boolean) => ({
  ...baseStyle,
  backgroundColor: gameOver ? "#ffaaff" : "#aaaaff",
  cursor: "pointer",
})

const openStyle = (isWin: boolean) => ({
  ...baseStyle,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  backgroundColor: isWin ? "#bdea9a" : "#fafafa",
})

const bombStyle = (showHidden: boolean) => ({
  ...baseStyle,
  backgroundColor: showHidden ? "#dddddd" : "#ffcccc",
})

interface SquareProps extends Square {
  clickHandler: (
    status: "hidden" | "marked"
  ) => (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  gameState: GameState
}

function Square({
  isBomb,
  status,
  bombCount,
  clickHandler,
  gameState,
}: SquareProps) {
  if (
    (status === "hidden" || status === "marked") &&
    (gameState === GameState.Lose || gameState === GameState.Win)
  ) {
    if (isBomb) {
      return (
        <div style={bombStyle(true)}>
          <Bomb />
        </div>
      )
    }
    return (
      <div
        style={status === "hidden" ? hiddenStyle(true) : markedStyle(true)}
      />
    )
  }
  if (status === "hidden" || status === "marked") {
    return (
      <div
        style={status === "hidden" ? hiddenStyle(false) : markedStyle(false)}
        onMouseDown={clickHandler(status)}
        onMouseUp={clickHandler(status)}
      />
    )
  }
  if (isBomb) {
    return (
      <div style={bombStyle(false)}>
        <Bomb />
      </div>
    )
  }
  return (
    <div style={openStyle(gameState === GameState.Win)}>
      {bombCount > 0 ? bombCount : ""}
    </div>
  )
}

function Bomb() {
  return (
    <div
      style={{
        position: "relative",
        left: "20%",
        top: "25%",
        height: "60%",
        width: "60%",
        borderRadius: "50%",
        backgroundColor: "#000000",
      }}
    >
      <div
        style={{
          height: "30%",
          width: "30%",
          borderRadius: "50%",
          backgroundColor: "#ff0000",
        }}
      >
        <div
          style={{
            position: "relative",
            left: "20%",
            top: "20%",
            height: "60%",
            width: "60%",
            borderRadius: "50%",
            backgroundColor: "#ffff00",
          }}
        ></div>
      </div>
    </div>
  )
}

export default App
