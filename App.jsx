import { useState, useRef, useEffect } from "react"
import Die from "./Die"

export default function App() {
    const [dice, setDice] = useState(() => {
        const saved = localStorage.getItem("dice")
        return saved ? JSON.parse(saved) : generateAllNewDice()
    })
    const [cryptoState, setCryptoState] = useState(() => {
        const saved = localStorage.getItem("cryptoState")
        return saved ? JSON.parse(saved) : {
            airdropPoints: 0,
            airdropThreshold: 100,
            tokenSymbol: "TENZ",
            achievements: []
        }
    })
    const [gameSession, setGameSession] = useState(() => {
        const saved = localStorage.getItem("gameSession")
        return saved ? JSON.parse(saved) : {
            timer: 180,
            rollCount: 0,
            maxRolls: 15,
            startTime: null,
            status: 'idle'
        }
    })
    const [playerProgress, setPlayerProgress] = useState(() => {
        const saved = localStorage.getItem("playerProgress")
        if (saved) {
            const parsed = JSON.parse(saved)
            return {
                totalGames: parsed.totalGames || 0,
                totalWins: parsed.totalWins || 0,
                bestTime: parsed.bestTime ?? null,
                currentStreak: parsed.currentStreak || 0,
                totalPoints: parsed.totalPoints || 0
            }
        }
        return {
            totalGames: 0,
            totalWins: 0,
            bestTime: null,
            currentStreak: 0,
            totalPoints: 0
        }
    })

    const airdropEligible = cryptoState.airdropPoints >= cryptoState.airdropThreshold
    const rollsRemaining = gameSession.maxRolls - gameSession.rollCount
    const gameActive = gameSession.status === 'playing'
    const gameWon = dice.every(die => die.isHeld) && dice.every(die => die.value === dice[0].value)
    const gameLost = gameSession.status === 'lost'
    const buttonRef = useRef(null)

    useEffect(() => {
        localStorage.setItem("cryptoState", JSON.stringify(cryptoState))
    }, [cryptoState])

    useEffect(() => {
        localStorage.setItem("playerProgress", JSON.stringify(playerProgress))
    }, [playerProgress])

    useEffect(() => {
        localStorage.setItem("dice", JSON.stringify(dice))
    }, [dice])

    useEffect(() => {
        localStorage.setItem("gameSession", JSON.stringify(gameSession))
    }, [gameSession])

    useEffect(() => {
        let interval = null
        if (gameActive && gameSession.timer > 0 && !gameWon) {
            interval = setInterval(() => {
                setGameSession(prev => {
                    if (prev.timer <= 1) {
                        return { ...prev, timer: 0, status: 'lost' }
                    }
                    return { ...prev, timer: prev.timer - 1 }
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [gameActive, gameSession.timer, gameWon])

    useEffect(() => {
        if (gameWon && gameActive) {
            const timeUsed = 180 - gameSession.timer
            const points = calculatePoints(timeUsed, gameSession.rollCount)
            setGameSession(prev => ({ ...prev, status: 'won' }))
            setCryptoState(prev => ({ ...prev, airdropPoints: prev.airdropPoints + points }))
            setPlayerProgress(prev => ({
                totalGames: prev.totalGames + 1,
                totalWins: prev.totalWins + 1,
                bestTime: prev.bestTime ? Math.min(prev.bestTime, timeUsed) : timeUsed,
                currentStreak: Number(prev.currentStreak) + 1,
                totalPoints: prev.totalPoints + points
            }))
            buttonRef.current.focus()
        }
    }, [gameWon, gameActive, gameSession.timer, gameSession.rollCount])

    useEffect(() => {
        if (gameLost) {
            setPlayerProgress(prev => ({
                totalGames: prev.totalGames + 1,
                totalWins: prev.totalWins,
                bestTime: prev.bestTime,
                currentStreak: 0,
                totalPoints: prev.totalPoints
            }))
        }
    }, [gameLost])

    function generateNewId() {
        return crypto.randomUUID()
    }

    function generateAllNewDice() {
        return new Array(10)
            .fill(0)
            .map(() => ({
                value: Math.ceil(Math.random() * 6),
                isHeld: false,
                id: generateNewId()
            }))
    }

    function calculatePoints(timeUsed, rollsUsed) {
        const basePoints = 10
        const timeBonus = Math.max(0, 60 - timeUsed) * 0.5
        const rollBonus = Math.max(0, 10 - rollsUsed) * 2
        return Math.floor(basePoints + timeBonus + rollBonus)
    }

    function rollDice() {
        if (gameWon || gameLost) {
            setDice(generateAllNewDice())
            setGameSession({
                timer: 180,
                rollCount: 0,
                maxRolls: 15,
                startTime: null,
                status: 'idle'
            })
        } else if (rollsRemaining > 0) {
            if (gameSession.status === 'idle') {
                setGameSession(prev => ({
                    ...prev,
                    status: 'playing',
                    startTime: Date.now()
                }))
            }
            setDice(oldDice => oldDice.map(die =>
                die.isHeld ? die : { ...die, value: Math.ceil(Math.random() * 6) }
            ))
            setGameSession(prev => {
                const newRollCount = prev.rollCount + 1
                return {
                    ...prev,
                    rollCount: newRollCount,
                    status: newRollCount >= prev.maxRolls ? 'lost' : prev.status
                }
            })
        }
    }

    function hold(id) {
        if (gameActive && !gameWon) {
            setDice(oldDice => oldDice.map(die =>
                die.id === id ? { ...die, isHeld: !die.isHeld } : die
            ))
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const diceElements = dice.map(dieObj => (
        <Die
            key={dieObj.id}
            value={dieObj.value}
            isHeld={dieObj.isHeld}
            hold={() => hold(dieObj.id)}
        />
    ))

    const getButtonText = () => {
        if (gameWon) return "New Game"
        if (gameLost) return "Try Again"
        if (rollsRemaining === 0) return "Game Over"
        return "Roll"
    }

    const airdropProgress = Math.min(100, (cryptoState.airdropPoints / cryptoState.airdropThreshold) * 100)

    return (
        <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-800 p-5 text-white">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-xl">
                <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
                    ₿ Crypto Tenzies <span className="text-yellow-400">{cryptoState.tokenSymbol}</span>
                </h1>
                <p className="text-center text-gray-300 mt-2">Earn tokens through skillful play!</p>
                <div className="grid grid-cols-3 gap-4 bg-white/10 p-4 rounded-lg mt-6">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase">Time</p>
                        <p className={`${gameSession.timer <= 30 ? 'text-orange-400 animate-pulse' : 'text-cyan-400'} font-mono text-lg`}>
                            {formatTime(gameSession.timer)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase">Rolls Left</p>
                        <p className={`${rollsRemaining <= 3 ? 'text-orange-400 animate-pulse' : 'text-cyan-400'} font-mono text-lg`}>
                            {rollsRemaining}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase">Streak</p>
                        <p className="text-cyan-400 font-mono text-lg">{playerProgress.currentStreak}</p>
                    </div>
                </div>
                {gameWon && <p className="text-green-400 bg-green-900/20 p-3 mt-4 rounded-lg text-center">🎉 Victory! You earned {calculatePoints(180 - gameSession.timer, gameSession.rollCount)} {cryptoState.tokenSymbol} tokens!</p>}
                {gameLost && <p className="text-red-400 bg-red-900/20 p-3 mt-4 rounded-lg text-center">💔 Game Over! Try again to earn tokens!</p>}
                <p className="text-center text-gray-300 mt-4">Roll until all dice match. Click each die to hold it.</p>
                <div className="grid grid-cols-5 gap-3 mt-5 bg-black/20 p-4 rounded-xl cursor-pointer">
                    {diceElements}
                </div>
                <button
                    ref={buttonRef}
                    className={`w-full mt-5 py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${gameWon ? 'bg-green-500 hover:bg-green-600' : gameLost ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}cursor-pointer`}
                    onClick={rollDice}
                    disabled={rollsRemaining === 0 && !gameWon && !gameLost}
                >
                    {getButtonText()}
                </button>
                <div className="mt-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-cyan-400 font-semibold">Airdrop Progress</h3>
                        <span className={`${airdropEligible ? 'text-green-400' : 'text-gray-400'}`}>
                            {airdropEligible ? '✅ Eligible' : '⏳ In Progress'}
                        </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 mt-2">
                        <div
                            className="h-3 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${airdropProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-center text-gray-300 mt-1">{cryptoState.airdropPoints}/{cryptoState.airdropThreshold} points {airdropEligible && "🚀"}</p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 bg-[#0d1224] p-4 rounded-2xl border border-gray-700 w-full max-w-md">
                    <div className="flex flex-col items-center justify-center border border-gray-700 rounded-xl py-4">
                        <span className="text-cyan-400 text-xl font-bold">{playerProgress.totalWins}</span>
                        <span className="text-gray-400 text-xs mt-1">WINS</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border border-gray-700 rounded-xl py-4">
                        <span className="text-cyan-400 text-xl font-bold">{playerProgress.totalGames}</span>
                        <span className="text-gray-400 text-xs mt-1">GAMES</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border border-gray-700 rounded-xl py-4">
                        <span className="text-cyan-400 text-xl font-bold">{playerProgress.totalPoints}</span>
                        <span className="text-gray-400 text-xs mt-1">TOTAL POINTS</span>
                    </div>
                    <div className="flex flex-col items-center justify-center border border-gray-700 rounded-xl py-4">
                        <span className="text-cyan-400 text-xl font-bold">
                            {playerProgress.bestTime !== null ? `${playerProgress.bestTime}s` : "-"}
                        </span>
                        <span className="text-gray-400 text-xs mt-1">BEST TIME</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
