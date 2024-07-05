import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supabase from '../utils/supabase';
import './leaderBoard.css';
import Confetti from 'react-confetti';

const Leaderboard = ({ userWallet }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [userScore, setUserScore] = useState(null);
    const [userRank, setUserRank] = useState(null);
    const [userCoin, setUserCoin] = useState(0);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            // Fetch all users to determine the rank
            const { data: allUsersData, error: allUsersError } = await supabase
                .from('users')
                .select('wallet, score')
                .order('score', { ascending: false });

            if (allUsersError) throw allUsersError;

            // Fetch user's score
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('score, coin')
                .eq('wallet', userWallet)
                .single();

            if (userError) throw userError;

            setUserScore(userData?.score || 0); // Default to 0 if user score is not found
            setUserCoin(userData?.coin || 0);
            // Determine user's rank
            const userRank = allUsersData.findIndex(user => user.wallet === userWallet) + 1;
            setUserRank(userRank);

            // Fetch top 10 leaderboard
            const top10Leaderboard = allUsersData.slice(0, 10);
            setLeaderboard(top10Leaderboard);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setLoading(false);
        }
    };

    const handleClaim = async () => {
        if (userCoin <= 0 || claiming) return;
        setClaiming(true);

        try {
            const response = await axios.post('https://two048-web3-game.onrender.com/sendTransaction', {
                toWallet: userWallet,
                amountInLamports: userCoin * 1000000000
            });

            if (response.status === 200) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);
             
                // Update user's coins to 0 after successful claim
                await supabase
                    .from('users')
                    .update({ coin: 0 })
                    .eq('wallet', userWallet);

                setUserCoin(0);
            } else {
                console.error('Error sending transaction:', response.data);
            }
        } catch (error) {
            console.error('Error sending transaction:', error);
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return <div>Loading leaderboard...</div>;
    }

    return (
        <div className="leaderboard">
             {showConfetti && <Confetti />}
            <h2>Leaderboard</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Wallet</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((user, index) => (
                        <tr key={user.wallet}>
                            <td>{index + 1}</td>
                            <td>{user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}</td>
                            <td>{user.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="user-stats">
                <h3>Your Stats</h3>
                <p>Your Rank: {userRank}</p>
                <p>Your Score: {userScore}</p>
                <p>Your Coins: {userCoin}</p> {/* Display user coins */}
                <button 
                  className="claim-button"
                    onClick={handleClaim} 
                    disabled={userCoin <= 0 || claiming}
                >
                    {claiming ? 'Claiming...' : 'Claim Coins'}
                </button>
            </div>
        </div>
    );
};

export default Leaderboard;
