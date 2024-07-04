// File: src/components/board.jsx
import React, { useState, useEffect } from 'react';
import Tile from './tile';
import './board.css';
import { Block, gameBlockchain } from './blockchain';
import supabase from '../utils/supabase';

const createBoard = () => {
    return Array(4).fill(null).map(() => Array(4).fill(0));
};

const Board = ({ wallet }) => {
    const [board, setBoard] = useState(createBoard());
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        startGame();
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const startGame = () => {
        const newBoard = createBoard();
        addTile(newBoard);
        addTile(newBoard);
        setBoard(newBoard);
        setGameOver(false);
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
    };

    const handleTouchEnd = (e) => {
        if (gameOver) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        let moved = false;

        if (absDeltaX > absDeltaY) {
            if (deltaX > 0) {
                moved = moveRight();
            } else {
                moved = moveLeft();
            }
        } else {
            if (deltaY > 0) {
                moved = moveDown();
            } else {
                moved = moveUp();
            }
        }

        if (moved) {
            const newBoard = [...board];
            addTile(newBoard);
            setBoard(newBoard);
            recordMove();
            if (!canMove(newBoard)) {
                setGameOver(true);
                saveScoreToSupabase(newBoard);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (gameOver) return;

        let moved = false;
        switch (e.key) {
            case 'ArrowUp':
                moved = moveUp();
                break;
            case 'ArrowDown':
                moved = moveDown();
                break;
            case 'ArrowLeft':
                moved = moveLeft();
                break;
            case 'ArrowRight':
                moved = moveRight();
                break;
            default:
                break;
        }

        if (moved) {
            const newBoard = [...board];
            addTile(newBoard);
            setBoard(newBoard);
            recordMove();
            if (!canMove(newBoard)) {
                setGameOver(true);
                saveScoreToSupabase(newBoard);
            }
        }
    };

    const addTile = (board) => {
        let emptyTiles = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] === 0) {
                    emptyTiles.push({ x: i, y: j });
                }
            }
        }

        if (emptyTiles.length === 0) return false;

        let { x, y } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        board[x][y] = Math.random() < 0.9 ? 2 : 4;
        return true;
    };

    const recordMove = () => {
        const gameState = {
            board: board,
            timestamp: new Date().toISOString()
        };
        const newBlock = new Block(gameBlockchain.chain.length, new Date().toISOString(), gameState);
        gameBlockchain.addBlock(newBlock);
    };

    const compress = (row) => {
        let newRow = row.filter(val => val !== 0);
        for (let i = 0; i < newRow.length - 1; i++) {
            if (newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                newRow[i + 1] = 0;
            }
        }
        newRow = newRow.filter(val => val !== 0);
        while (newRow.length < 4) {
            newRow.push(0);
        }
        return newRow;
    };

    const moveUp = () => {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let column = board.map(row => row[j]);
            let compressedColumn = compress(column);
            if (JSON.stringify(column) !== JSON.stringify(compressedColumn)) {
                moved = true;
            }
            for (let i = 0; i < 4; i++) {
                board[i][j] = compressedColumn[i];
            }
        }
        return moved;
    };

    const moveDown = () => {
        let moved = false;
        for (let j = 0; j < 4; j++) {
            let column = board.map(row => row[j]).reverse();
            let compressedColumn = compress(column).reverse();
            if (JSON.stringify(column.reverse()) !== JSON.stringify(compressedColumn)) {
                moved = true;
            }
            for (let i = 0; i < 4; i++) {
                board[i][j] = compressedColumn[i];
            }
        }
        return moved;
    };

    const moveLeft = () => {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            let row = board[i];
            let compressedRow = compress(row);
            if (JSON.stringify(row) !== JSON.stringify(compressedRow)) {
                moved = true;
            }
            board[i] = compressedRow;
        }
        return moved;
    };

    const moveRight = () => {
        let moved = false;
        for (let i = 0; i < 4; i++) {
            let row = board[i].reverse();
            let compressedRow = compress(row).reverse();
            if (JSON.stringify(row.reverse()) !== JSON.stringify(compressedRow)) {
                moved = true;
            }
            board[i] = compressedRow;
        }
        return moved;
    };

    const canMove = (board) => {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] === 0) return true;
                if (j < 3 && board[i][j] === board[i][j + 1]) return true;
                if (i < 3 && board[i][j] === board[i + 1][j]) return true;
            }
        }
        return false;
    };

    const saveScoreToSupabase = async (board) => {
        const score = calculateScore(board);
        const { data, error } = await supabase
            .from('users')
            .update({ score: score })
            .eq('wallet', wallet);

        if (error) {
            console.error('Error saving score:', error);
        }
    };

    const calculateScore = (board) => {
        let score = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                score += board[i][j];
            }
        }
        return score;
    };

    return (
        <div>
            {gameOver && <div className="game-over">Game Over!</div>}
            <div id="game-container">
                {board.map((row, rowIndex) => (
                    row.map((tileValue, colIndex) => (
                        <Tile key={`${rowIndex}-${colIndex}`} value={tileValue} />
                    ))
                ))}
            </div>
            {gameOver && <button onClick={startGame} className="restart-button">Restart</button>}
        </div>
    );
};

export default Board;