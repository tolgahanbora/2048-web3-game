import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabase';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletConnect = ({ onWalletConnected }) => {
    const { wallet, connect, publicKey } = useWallet();
    const { connection } = useConnection();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (publicKey) {
            const walletAddress = publicKey.toString();
            saveWalletToSupabase(walletAddress);
        }
    }, [publicKey]);

    const saveWalletToSupabase = async (walletAddress) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .upsert({ wallet: walletAddress })
            .eq('wallet', walletAddress);

        setLoading(false);

        if (error) {
            console.error('Error saving wallet:', error);
        } else {
            onWalletConnected(walletAddress);
        }
    };

    return (
        <div>
            <WalletModalProvider>
                <WalletMultiButton />
            </WalletModalProvider>
            {loading && <p>Loading...</p>}
        </div>
    );
};

export default WalletConnect;
