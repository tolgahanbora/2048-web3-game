import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabase';
import './leaderBoard.css';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('wallet, score')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;

            setLeaderboard(data);
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
        </div>
    );
};

export default Leaderboard;