import React, { useState } from 'react';
import Board from './components/board';
import WalletConnect from './components/walletConnect';
import './App.css';

function App() {
    const [wallet, setWallet] = useState(null);

    const handleWalletConnected = (walletAddress) => {
        setWallet(walletAddress);
    };

    return (
        <div className="App">
            <h1>2048 Game with Blockchain</h1>
            {!wallet ? (
                <WalletConnect onWalletConnected={handleWalletConnected} />
            ) : (
                <Board wallet={wallet} />
            )}
        </div>
    );
}

export default App;
