export default function Die({ value, isHeld, hold }) {
    const cryptoSymbols = ['₿', 'Ξ', '◊', '∆', '○', '☆']
    
    return (
        <button 
            className={`die p-4 rounded-lg text-2xl font-bold transition-colors 
        ${isHeld ? 'bg-green-500 text-white' : 'bg-white text-black'} cursor-pointer`}
            onClick={hold}
            aria-pressed={isHeld}
            aria-label={`Die with value ${value}, ${isHeld ? "held" : "not held"}`}
        >
            {cryptoSymbols[value - 1]}
        </button>
    )
}