import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabase';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletConnect = ({ onWalletConnected }) => {
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (publicKey) {
            const walletAddress = publicKey.toString();
            checkAndSaveWallet(walletAddress);
        }
    }, [publicKey]);

    const checkAndSaveWallet = async (walletAddress) => {
        setLoading(true);
        
        try {
            // Check if the wallet address already exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('wallet')
                .eq('wallet', walletAddress)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                // Handle the error only if it's not a 'No Rows Found' error
                throw fetchError;
            }

            if (!existingUser) {
                // If the wallet address does not exist, save it
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({ wallet: walletAddress });

                if (insertError) {
                    throw insertError;
                }
            }

            // Call the callback whether the wallet was newly inserted or already existed
            onWalletConnected(walletAddress);
        } catch (error) {
            console.error('Error handling wallet:', error);
        } finally {
            setLoading(false);
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
