import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabase';
import './leaderBoard.css';

const Leaderboard = ({ userWallet }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [userScore, setUserScore] = useState(null);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);

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
                .select('score')
                .eq('wallet', userWallet)
                .single();

            if (userError) throw userError;

            setUserScore(userData?.score || 0); // Default to 0 if user score is not found

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

    if (loading) {
        return <div>Loading leaderboard...</div>;
    }

    return (
        <div className="leaderboard">
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
                
            </div>
        </div>
    );
};

export default Leaderboard;
